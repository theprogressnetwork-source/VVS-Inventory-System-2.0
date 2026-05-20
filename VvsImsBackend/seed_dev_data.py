#!/usr/bin/env python3
"""
=============================================================================
 VVS IMS — Development Data Seeder
=============================================================================
 Populates the SQLite dev database with production-representative data.
 
 Since the contractor's MySQL at 148.230.80.152 is IP-restricted, this script
 generates realistic data based on the actual VVS inventory domain model:
   - Phone/tablet models (iPhone, Samsung Galaxy, Google Pixel, iPad)
   - Storage variants (64 GB through 1 TB)
   - Colors, Grades, SKUs, IMEIs
   - Multi-channel pricing (BestBuy, Amazon, eBay)
   - Stock items with IMEI tracking
   - Inventory aggregates with platform pricing
   - Channel mappings, inventory events, notifications
   - Additional users with HMACSHA512 password hashes

 Target: VvsImsBackend/src/VvsIms.Api/vvs_ims_dev.db
 Schema: EF Core owned entity tables (BaseProperties, Money value objects)

 Usage:
   python3 seed_dev_data.py
=============================================================================
"""

import sqlite3
import hashlib
import hmac
import random
import os
import sys
from datetime import datetime, timedelta, timezone

# ── Configuration ──────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       "src", "VvsIms.Api", "vvs_ims_dev.db")
DEFAULT_PASSWORD = "Admin@2026!"
CAD = "CAD"

# ── Production-Representative Domain Data ──────────────────────────────────
MODELS = [
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 15 Plus",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 14 Plus",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 Mini",
    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 Mini",
    "iPhone SE 3rd Gen", "iPhone SE 2nd Gen",
    "Samsung Galaxy S24 Ultra", "Samsung Galaxy S24+", "Samsung Galaxy S24",
    "Samsung Galaxy S23 Ultra", "Samsung Galaxy S23+", "Samsung Galaxy S23",
    "Samsung Galaxy S22 Ultra", "Samsung Galaxy S22+", "Samsung Galaxy S22",
    "Samsung Galaxy Z Fold5", "Samsung Galaxy Z Flip5",
    "Samsung Galaxy A54", "Samsung Galaxy A34",
    "Google Pixel 8 Pro", "Google Pixel 8", "Google Pixel 7a",
    "iPad Pro 12.9 M2", "iPad Pro 11 M2", "iPad Air M1",
    "iPad 10th Gen", "iPad Mini 6",
]

STORAGES = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"]

COLORS_BY_MODEL = {
    "iPhone 15 Pro Max": ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"],
    "iPhone 15 Pro": ["Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"],
    "iPhone 15": ["Pink", "Yellow", "Green", "Blue", "Black"],
    "iPhone 15 Plus": ["Pink", "Yellow", "Green", "Blue", "Black"],
    "iPhone 14 Pro Max": ["Deep Purple", "Gold", "Silver", "Space Black"],
    "iPhone 14 Pro": ["Deep Purple", "Gold", "Silver", "Space Black"],
    "iPhone 14": ["Blue", "Purple", "Midnight", "Starlight", "Red"],
    "iPhone 14 Plus": ["Blue", "Purple", "Midnight", "Starlight", "Red"],
    "iPhone 13 Pro Max": ["Sierra Blue", "Gold", "Silver", "Graphite"],
    "iPhone 13 Pro": ["Sierra Blue", "Gold", "Silver", "Graphite"],
    "iPhone 13": ["Pink", "Blue", "Midnight", "Starlight", "Red"],
    "iPhone 13 Mini": ["Pink", "Blue", "Midnight", "Starlight", "Red"],
    "iPhone 12 Pro Max": ["Pacific Blue", "Gold", "Silver", "Graphite"],
    "iPhone 12 Pro": ["Pacific Blue", "Gold", "Silver", "Graphite"],
    "iPhone 12": ["Blue", "Green", "Red", "White", "Black"],
    "iPhone 12 Mini": ["Blue", "Green", "Red", "White", "Black"],
    "iPhone SE 3rd Gen": ["Midnight", "Starlight", "Red"],
    "iPhone SE 2nd Gen": ["Black", "White", "Red"],
    "Samsung Galaxy S24 Ultra": ["Titanium Gray", "Titanium Black", "Titanium Violet", "Titanium Yellow"],
    "Samsung Galaxy S24+": ["Onyx", "Marble", "Cobalt Violet", "Jade Green"],
    "Samsung Galaxy S24": ["Onyx", "Marble", "Cobalt Violet", "Jade Green"],
    "Samsung Galaxy S23 Ultra": ["Phantom Black", "Cream", "Green", "Lavender"],
    "Samsung Galaxy S23+": ["Phantom Black", "Cream", "Green", "Lavender"],
    "Samsung Galaxy S23": ["Phantom Black", "Cream", "Green", "Lavender"],
    "Samsung Galaxy S22 Ultra": ["Phantom Black", "White", "Burgundy", "Green"],
    "Samsung Galaxy S22+": ["Phantom Black", "White", "Pink Gold", "Green"],
    "Samsung Galaxy S22": ["Phantom Black", "White", "Pink Gold", "Green"],
    "Samsung Galaxy Z Fold5": ["Phantom Black", "Cream", "Icy Blue", "Lavender"],
    "Samsung Galaxy Z Flip5": ["Lavender", "Mint", "Graphite", "Cream", "Blue"],
    "Samsung Galaxy A54": ["Awesome Graphite", "Awesome Violet", "Awesome White", "Awesome Lime"],
    "Samsung Galaxy A34": ["Awesome Graphite", "Awesome Silver", "Awesome Violet", "Awesome Lime"],
    "Google Pixel 8 Pro": ["Obsidian", "Porcelain", "Bay"],
    "Google Pixel 8": ["Obsidian", "Hazel", "Rose", "Mint"],
    "Google Pixel 7a": ["Charcoal", "Snow", "Sea", "Coral"],
    "iPad Pro 12.9 M2": ["Space Gray", "Silver"],
    "iPad Pro 11 M2": ["Space Gray", "Silver"],
    "iPad Air M1": ["Space Gray", "Starlight", "Purple", "Blue"],
    "iPad 10th Gen": ["Silver", "Yellow", "Violet", "Blue", "Pink"],
    "iPad Mini 6": ["Space Gray", "Pink", "Purple", "Starlight"],
}

GRADES = [(0, "Good"), (1, "OpenBox"), (2, "Excellent")]

COST_RANGES = {
    "iPhone 15": (850, 1450), "iPhone 14": (650, 1200),
    "iPhone 13": (450, 950), "iPhone 12": (300, 700),
    "iPhone SE": (150, 400), "Samsung Galaxy S2": (400, 1100),
    "Samsung Galaxy Z": (600, 1400), "Samsung Galaxy A": (150, 400),
    "Google Pixel": (300, 800), "iPad": (300, 1200),
}

PLATFORMS = [0, 1, 2]
PLATFORM_NAMES = {0: "BestBuy", 1: "Amazon", 2: "eBay"}

# ── Helpers ────────────────────────────────────────────────────────────────

def generate_sku(model, storage, color, grade):
    raw = f"{model}|{storage}|{color}|{grade}"
    digest = hashlib.md5(raw.encode()).hexdigest()
    return str(int(digest[:8], 16))[:8]


def generate_imei():
    digits = [random.randint(0, 9) for _ in range(14)]
    total = 0
    for i, d in enumerate(digits):
        if i % 2 == 0:
            d2 = d * 2
            total += d2 if d2 < 10 else d2 - 9
        else:
            total += d
    check = (10 - (total % 10)) % 10
    return "".join(str(d) for d in digits) + str(check)


def get_cost_range(model):
    for prefix, rng in COST_RANGES.items():
        if model.startswith(prefix):
            return rng
    return (200, 600)


def random_cost(model):
    low, high = get_cost_range(model)
    return round(random.uniform(low, high), 2)


def utc_now_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.0000000Z")


def random_past_date(days_back=90):
    delta = timedelta(days=random.randint(0, days_back))
    dt = datetime.now(timezone.utc) - delta
    return dt.strftime("%Y-%m-%dT%H:%M:%S.0000000Z")


def random_future_date(days_ahead=30):
    delta = timedelta(days=random.randint(1, days_ahead))
    dt = datetime.now(timezone.utc) + delta
    return dt.strftime("%Y-%m-%dT%H:%M:%S.0000000Z")


def hmacsha512_hash(password):
    salt = os.urandom(16)
    h = hmac.new(salt, password.encode("utf-8"), hashlib.sha512).digest()
    return h, salt


# ── Data Generators ────────────────────────────────────────────────────────

def gen_product_skus(n=50):
    skus = []
    seen = set()
    attempts = 0
    while len(skus) < n and attempts < n * 10:
        attempts += 1
        model = random.choice(MODELS)
        storage = random.choice(STORAGES)
        colors = COLORS_BY_MODEL.get(model, ["Black", "White", "Blue"])
        color = random.choice(colors)
        grade = random.choice([g[0] for g in GRADES])
        sku = generate_sku(model, storage, color, grade)
        if sku in seen:
            continue
        seen.add(sku)
        skus.append({"Sku": sku, "Model": model, "Storage": storage,
                      "Color": color, "Grade": grade})
    return skus


def gen_stock_items(product_skus, n=200):
    items = []
    used_imeis = set()
    for _ in range(n):
        psku = random.choice(product_skus)
        cost = random_cost(psku["Model"])
        while True:
            imei = generate_imei()
            if imei not in used_imeis:
                used_imeis.add(imei)
                break
        platform = random.choice(PLATFORMS)
        is_shipped = random.random() < 0.3
        if is_shipped:
            order_status = random.choice(["Shipped", "Delivered"])
        elif random.random() < 0.2:
            order_status = random.choice(["Pending", "Processing", "Returned"])
        else:
            order_status = None
        items.append({
            "Imei": imei,
            "OrderNo": f"ORD-{random.randint(10000, 99999)}" if random.random() < 0.6 else None,
            "DateSold": random_past_date(60) if random.random() < 0.25 else None,
            "DateAdded": random_past_date(90),
            "Rma": 1 if random.random() < 0.05 else 0,
            "Vendor": random.choice(["BestBuy Wholesale", "Amazon Renewed",
                                      "eBay Supplier", "Direct Trade-In",
                                      "PhoneCheck Certified"]),
            "InvoiceNumber": f"INV-{random.randint(100000, 999999)}" if random.random() < 0.5 else None,
            "PhoneCheck": 1 if random.random() > 0.15 else 0,
            "IsManualImei": 1 if random.random() < 0.1 else 0,
            "OrderStatus": order_status,
            "IsShipped": 1 if is_shipped else 0,
            "ShippedDate": random_past_date(30) if is_shipped else None,
            "OrderLandingDate": random_past_date(14) if is_shipped else None,
            "Model": psku["Model"], "Storage": psku["Storage"],
            "Color": psku["Color"], "Grade": psku["Grade"],
            "Sku": psku["Sku"], "Cost": cost, "BuyingPlatform": platform,
        })
    return items


def gen_inventory_records(product_skus, n=40):
    records = []
    for psku in product_skus[:n]:
        cost = random_cost(psku["Model"])
        quantity = random.randint(1, 25)
        winning = random.random() < 0.4
        platform = random.choice(PLATFORMS)
        platform_price = round(cost * random.uniform(1.1, 1.5), 2) if random.random() > 0.2 else None
        platform_discount_price = round(platform_price * random.uniform(0.85, 0.95), 2) if platform_price and random.random() < 0.3 else None
        selling_price = round(cost * random.uniform(1.05, 1.3), 2)
        bought = round(cost * random.uniform(0.8, 1.0), 2)
        adjustment_price = round(selling_price * random.uniform(0.9, 1.1), 2) if random.random() < 0.3 else None
        product_winning_price = round(cost * random.uniform(1.0, 1.2), 2) if random.random() < 0.5 else None
        platform_winner_price = round(platform_price * random.uniform(0.9, 1.1), 2) if platform_price else None
        platform_winner_shipping = round(random.uniform(5.0, 25.0), 2) if platform_winner_price else None
        platform_difference = round(platform_price - platform_winner_price, 2) if platform_price and platform_winner_price else None
        records.append({
            "Quantity": quantity, "Winning": 1 if winning else 0,
            "Platform": platform,
            "PlatformDiscountStartDate": random_past_date(30) if platform_discount_price else None,
            "PlatformDiscountEndDate": random_future_date(30) if platform_discount_price else None,
            "PlatformQuantity": random.randint(1, 10) if random.random() > 0.3 else None,
            "PlatformSkuTitle": f"{psku['Model']} {psku['Storage']} {psku['Color']}" if random.random() > 0.2 else None,
            "PlatformWinningOffer": 1 if winning else (0 if random.random() > 0.5 else None),
            "Model": psku["Model"], "Storage": psku["Storage"],
            "Color": psku["Color"], "Grade": psku["Grade"],
            "Sku": psku["Sku"], "Cost": cost, "BuyingPlatform": platform,
            "AdjustmentPrice": adjustment_price,
            "SellingPrice": selling_price, "Bought": bought,
            "ProductWinningPrice": product_winning_price,
            "PlatformPrice": platform_price,
            "PlatformDiscountPrice": platform_discount_price,
            "PlatformWinnerPrice": platform_winner_price,
            "PlatformWinnerShippingPrice": platform_winner_shipping,
            "PlatformDifference": platform_difference,
        })
    return records


def gen_channel_mappings(product_skus):
    mappings = []
    for psku in product_skus[:20]:
        for channel in ["Amazon", "Shopify", "BestBuy"]:
            if random.random() < 0.6:
                channel_sku = f"CH-{channel[:3].upper()}-{psku['Sku']}"
                shop_sku = f"SHOP-{psku['Sku']}" if channel == "Shopify" and random.random() < 0.5 else None
                mappings.append({"SystemSKU": psku["Sku"], "ChannelName": channel,
                                 "ChannelSKU": channel_sku, "ShopSKU": shop_sku})
    return mappings


def gen_inventory_events(inventory_ids, n=80):
    events = []
    channels = ["Amazon", "Shopify", "BestBuy"]
    reasons = ["Sale", "Restock", "PriceUpdate", "SyncCorrection",
               "ManualAdjustment", "Return", "ChannelSync"]
    for _ in range(n):
        events.append({
            "Channel": random.choice(channels),
            "ChannelEventId": f"EVT-{random.randint(100000, 999999)}",
            "InventoryId": random.choice(inventory_ids),
            "SystemSKU": f"{random.randint(10000000, 99999999)}",
            "Delta": random.choice([-2, -1, 1, 2, 3, 5, 10]),
            "Reason": random.choice(reasons),
            "OccurredAtUtc": random_past_date(30),
        })
    return events


def gen_notifications(n=15):
    notifs = []
    types = ["Info", "Warning", "Success", "Error"]
    titles = ["Low Stock Alert", "Price Update", "Sync Complete",
              "New Order Received", "Return Processed", "IMEI Verified",
              "Channel Sync Failed", "Inventory Reconciled"]
    messages = [
        "Stock for SKU %s has dropped below threshold.",
        "Platform price updated for %s.",
        "Channel sync completed successfully for %s.",
        "New order received from %s channel.",
        "Return processed for IMEI ending %s.",
        "IMEI verification passed for device %s.",
        "Channel sync encountered an error for %s.",
        "Inventory reconciliation completed for %s.",
    ]
    for _ in range(n):
        t = random.choice(titles)
        i = titles.index(t) % len(messages)
        notifs.append({
            "Title": t,
            "Message": messages[i] % f"{random.randint(10000000, 99999999)}",
            "Type": random.choice(types),
            "RelatedEntity": random.choice(["Stock", "Inventory", "ChannelMapping", "Order"]),
            "IsRead": 1 if random.random() < 0.5 else 0,
            "CreatedBy": "system",
        })
    return notifs


def gen_outgoing(stock_items, n=30):
    outgoing = []
    for _ in range(n):
        s = random.choice(stock_items)
        outgoing.append({
            "OrderNo": f"OUT-{random.randint(10000, 99999)}",
            "ProductTitle": f"{s['Model']} {s['Storage']} {s['Color']}",
            "Imei": s["Imei"],
            "Date": random_past_date(45),
            "OrderStatus": random.choice(["Shipped", "Delivered", "Processing"]),
        })
    return outgoing


def gen_pending(stock_items, n=20):
    pending = []
    for _ in range(n):
        s = random.choice(stock_items)
        pending.append({
            "OrderNo": f"PEND-{random.randint(10000, 99999)}",
            "DateAdded": random_past_date(14),
            "ProductTitle": f"{s['Model']} {s['Storage']} {s['Color']}",
            "Imei": s["Imei"],
        })
    return pending


def gen_thread_messages(n=25):
    threads = []
    senders = ["BestBuy Support", "Amazon Seller Central", "Shopify Help",
               "Customer Service", "Warehouse Team", "Procurement"]
    for _ in range(n):
        thread_id = f"THD-{random.randint(10000, 99999)}"
        order_id = f"ORD-{random.randint(10000, 99999)}"
        threads.append({
            "ThreadId": thread_id,
            "OrderId": order_id,
            "SenderName": random.choice(senders),
            "Message": random.choice([
                "Order confirmation received. Processing shipment.",
                "Customer inquiry about device condition.",
                "Return request submitted for IMEI verification.",
                "Price match request from competitor listing.",
                "Inventory discrepancy flagged during audit.",
                "Shipping delay notification from carrier.",
                "Restock alert for low-quantity SKU.",
            ]),
            "MessageDate": random_past_date(21),
        })
    return threads


def gen_thread_responses(thread_ids, n=15):
    responses = []
    for _ in range(n):
        tid = random.choice(thread_ids)
        responses.append({
            "ThreadId": tid,
            "OrderId": f"ORD-{random.randint(10000, 99999)}",
            "RespondedBy": random.choice(["admin", "manager", "support_agent"]),
            "Response": random.choice([
                "Acknowledged. Processing the request.",
                "Return approved. Shipping label generated.",
                "Price adjustment applied. Listing updated.",
                "Investigating the discrepancy. Will update shortly.",
                "Shipment rescheduled. New tracking provided.",
            ]),
            "ResponseDate": random_past_date(14),
            "Tag": random.choice(["urgent", "info", "action_required", "resolved"]),
            "ToType": random.choice(["email", "chat", "phone"]),
            "TopicType": random.choice(["order", "return", "pricing", "shipping"]),
            "TopicValue": random.choice(["OrderStatus", "ReturnRequest",
                                          "PriceMatch", "ShippingUpdate"]),
        })
    return responses


def gen_thread_statuses(thread_ids, n=20):
    statuses = []
    for _ in range(n):
        tid = random.choice(thread_ids)
        statuses.append({
            "ThreadId": tid,
            "OrderId": f"ORD-{random.randint(10000, 99999)}",
            "Status": random.choice(["Open", "In Progress", "Resolved", "Closed", "Escalated"]),
        })
    return statuses


def gen_users():
    users = [
        {"UserName": "admin", "UserFirstName": "Admin", "UserLastName": "User",
         "UserPreferredName": "Admin", "UserPhone": "+1-416-555-0001",
         "UserEmail": "admin@vvs-ims.local", "RoleId": 1, "IsActive": 1,
         "CreatedBy": "system"},
        {"UserName": "matthew", "UserFirstName": "Matthew", "UserLastName": "McNeil",
         "UserPreferredName": "Matt", "UserPhone": "+1-416-555-0002",
         "UserEmail": "matthew@vvs-ims.local", "RoleId": 1, "IsActive": 1,
         "CreatedBy": "system"},
        {"UserName": "sheraz", "UserFirstName": "Sheraz", "UserLastName": "Developer",
         "UserPreferredName": "Sheraz", "UserPhone": "+1-416-555-0003",
         "UserEmail": "sheraz@vvs-ims.local", "RoleId": 2, "IsActive": 1,
         "CreatedBy": "admin"},
        {"UserName": "warehouse", "UserFirstName": "Warehouse", "UserLastName": "Manager",
         "UserPreferredName": "WH Manager", "UserPhone": "+1-416-555-0004",
         "UserEmail": "warehouse@vvs-ims.local", "RoleId": 2, "IsActive": 1,
         "CreatedBy": "admin"},
        {"UserName": "sales", "UserFirstName": "Sales", "UserLastName": "Rep",
         "UserPreferredName": "Sales", "UserPhone": "+1-416-555-0005",
         "UserEmail": "sales@vvs-ims.local", "RoleId": 2, "IsActive": 1,
         "CreatedBy": "admin"},
        {"UserName": "viewer", "UserFirstName": "Read", "UserLastName": "Only",
         "UserPreferredName": "Viewer", "UserPhone": "+1-416-555-0006",
         "UserEmail": "viewer@vvs-ims.local", "RoleId": 2, "IsActive": 0,
         "CreatedBy": "admin"},
    ]
    return users


def gen_stock_returns(stock_items, n=10):
    returns = []
    for _ in range(n):
        s = random.choice(stock_items)
        returns.append({
            "StockId": None,  # will be set after stock insert
            "ReturnOrderNo": f"RET-{random.randint(10000, 99999)}",
            "ReturnDate": random_past_date(30),
            "Reason": random.choice(["Defective", "Wrong Item", "Customer Return",
                                      "Not As Described", "Changed Mind"]),
            "Channel": random.choice(["Amazon", "Shopify", "BestBuy"]),
            "Quantity": 1,
            "Imei": s["Imei"],
            "Sku": s["Sku"],
        })
    return returns


def gen_audit_logs(n=20):
    logs = []
    modules = ["Auth", "Stock", "Inventory", "ChannelMapping", "Sync"]
    actions = ["Create", "Update", "Delete", "Login", "Sync"]
    for _ in range(n):
        logs.append({
            "CorrelationId": f"CORR-{random.randint(100000, 999999)}",
            "Module": random.choice(modules),
            "Action": random.choice(actions),
            "Status": random.choice(["Success", "Failed", "Partial"]),
            "EntityType": random.choice(["Stock", "Inventory", "User", "ChannelMapping"]),
            "EntityKey": f"{random.randint(1, 200)}",
            "UserId": f"{random.randint(1, 6)}",
            "UserEmail": random.choice(["admin@vvs-ims.local", "matthew@vvs-ims.local",
                                         "warehouse@vvs-ims.local"]),
            "Endpoint": random.choice(["/api/stock", "/api/inventory",
                                        "/api/auth/login", "/api/channel-mappings"]),
            "HttpMethod": random.choice(["GET", "POST", "PUT", "DELETE"]),
            "ClientIp": f"192.168.1.{random.randint(1, 254)}",
            "DurationMs": random.randint(15, 500),
        })
    return logs


def gen_system_sku_snapshots(product_skus, n=15):
    snapshots = []
    for psku in product_skus[:n]:
        snapshots.append({
            "SystemSKU": psku["Sku"],
            "LastKnownAvailable": random.randint(0, 50),
            "LastSyncUtc": random_past_date(7),
        })
    return snapshots


def gen_idempotency_keys(n=10):
    keys = []
    for _ in range(n):
        keys.append({
            "Key": f"IDEMP-{random.randint(100000, 999999)}",
            "Success": 1 if random.random() > 0.2 else 0,
            "Result": random.choice(["Completed", "Failed", "Pending"]),
            "ProcessedAtUtc": random_past_date(14),
        })
    return keys


# ── Database Insertion ─────────────────────────────────────────────────────

def seed_database():
    print("=" * 70)
    print(" VVS IMS — Development Data Seeder")
    print("=" * 70)
    print(f" Target DB: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print(f" ERROR: Database not found at {DB_PATH}")
        print(" Run the backend first to create the initial DB with migrations.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = OFF")
    cur = conn.cursor()
    now = utc_now_str()

    # ── 1. Roles (preserve existing seed data) ─────────────────────────────
    print("\n[1/14] Seeding roles...")
    cur.execute("SELECT COUNT(*) FROM role")
    if cur.fetchone()[0] < 2:
        cur.execute("INSERT OR IGNORE INTO role (Id, RoleName, RoleDescription, RolePermissions, CreatedBy, CreatedAtUtc) VALUES (1, 'Admin', 'Full system administrator', 'all', 'system', ?)", (now,))
        cur.execute("INSERT OR IGNORE INTO role (Id, RoleName, RoleDescription, RolePermissions, CreatedBy, CreatedAtUtc) VALUES (2, 'User', 'Standard user with limited access', 'read,write', 'system', ?)", (now,))
    conn.commit()
    print("  -> Roles: 2 (Admin, User)")

    # ── 2. Users ───────────────────────────────────────────────────────────
    print("\n[2/14] Seeding users...")
    users = gen_users()
    user_count = 0
    for u in users:
        # Check if user already exists
        cur.execute("SELECT Id FROM user WHERE UserName = ?", (u["UserName"],))
        if cur.fetchone():
            continue
        pw_hash, pw_salt = hmacsha512_hash(DEFAULT_PASSWORD)
        cur.execute("""
            INSERT INTO user (UserName, UserFirstName, UserLastName, UserPreferredName,
                              UserPhone, UserEmail, PasswordHash, PasswordSalt,
                              IsActive, RoleId, CreatedBy, CreatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (u["UserName"], u["UserFirstName"], u["UserLastName"],
              u["UserPreferredName"], u["UserPhone"], u["UserEmail"],
              pw_hash, pw_salt, u["IsActive"], u["RoleId"],
              u["CreatedBy"], now))
        user_count += 1
    conn.commit()
    print(f"  -> Users seeded: {user_count} (all passwords: {DEFAULT_PASSWORD})")

    # ── 3. Product SKUs ────────────────────────────────────────────────────
    print("\n[3/14] Seeding product SKUs...")
    product_skus = gen_product_skus(50)
    for psku in product_skus:
        cur.execute("""
            INSERT INTO product_sku (Sku, Model, Storage, Color, Grade, CreatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (psku["Sku"], psku["Model"], psku["Storage"],
              psku["Color"], psku["Grade"], now))
    conn.commit()
    print(f"  -> Product SKUs: {len(product_skus)}")

    # ── 4. Stock ───────────────────────────────────────────────────────────
    print("\n[4/14] Seeding stock items...")
    stock_items = gen_stock_items(product_skus, 200)
    stock_ids = []
    for s in stock_items:
        cur.execute("""
            INSERT INTO stock (Imei, OrderNo, DateSold, DateAdded, Rma, Vendor,
                               InvoiceNumber, PhoneCheck, IsManualImei, OrderStatus,
                               IsShipped, ShippedDate, OrderLandingDate,
                               CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (s["Imei"], s["OrderNo"], s["DateSold"], s["DateAdded"],
              s["Rma"], s["Vendor"], s["InvoiceNumber"], s["PhoneCheck"],
              s["IsManualImei"], s["OrderStatus"], s["IsShipped"],
              s["ShippedDate"], s["OrderLandingDate"], now, now))
        stock_id = cur.lastrowid
        stock_ids.append(stock_id)

        # Insert owned entity: stock._base_properties#_base_properties
        cur.execute("""
            INSERT INTO "stock._base_properties#_base_properties"
                (StockId, model, storage, color, grade, sku, buying_platform)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (stock_id, s["Model"], s["Storage"], s["Color"],
              s["Grade"], s["Sku"], s["BuyingPlatform"]))

        # Insert owned entity: stock._base_properties#_base_properties._cost#_money
        cur.execute("""
            INSERT INTO "stock._base_properties#_base_properties._cost#_money"
                (BasePropertiesStockId, cost, cost_currency)
            VALUES (?, ?, ?)
        """, (stock_id, str(s["Cost"]), CAD))
    conn.commit()
    print(f"  -> Stock items: {len(stock_items)} (with BaseProperties + Cost)")

    # ── 5. Inventory ───────────────────────────────────────────────────────
    print("\n[5/14] Seeding inventory records...")
    inv_records = gen_inventory_records(product_skus, 40)
    inv_ids = []
    for inv in inv_records:
        cur.execute("""
            INSERT INTO inventory (Quantity, Winning, Platform,
                                   PlatformDiscountStartDate, PlatformDiscountEndDate,
                                   PlatformQuantity, PlatformSkuTitle,
                                   PlatformWinningOffer, CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (inv["Quantity"], inv["Winning"], inv["Platform"],
              inv["PlatformDiscountStartDate"], inv["PlatformDiscountEndDate"],
              inv["PlatformQuantity"], inv["PlatformSkuTitle"],
              inv["PlatformWinningOffer"], now, now))
        inv_id = cur.lastrowid
        inv_ids.append(inv_id)

        # inventory._base_properties#_base_properties
        cur.execute("""
            INSERT INTO "inventory._base_properties#_base_properties"
                (InventoryId, model, storage, color, grade, sku, buying_platform)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (inv_id, inv["Model"], inv["Storage"], inv["Color"],
              inv["Grade"], inv["Sku"], inv["BuyingPlatform"]))

        # inventory._base_properties#_base_properties._cost#_money
        cur.execute("""
            INSERT INTO "inventory._base_properties#_base_properties._cost#_money"
                (BasePropertiesInventoryId, cost, cost_currency)
            VALUES (?, ?, ?)
        """, (inv_id, str(inv["Cost"]), CAD))

        # Money owned entities (nullable)
        money_fields = [
            ("inventory._adjustment_price#_money", "InventoryId",
             "adjustment_price", "adjustment_price_currency", inv["AdjustmentPrice"]),
            ("inventory._selling_price#_money", "InventoryId",
             "selling_price", "selling_price_currency", inv["SellingPrice"]),
            ("inventory._bought#_money", "InventoryId",
             "bought", "bought_currency", inv["Bought"]),
            ("inventory._product_winning_price#_money", "InventoryId",
             "product_winning_price", "product_winning_price_currency", inv["ProductWinningPrice"]),
            ("inventory._platform_price#_money", "InventoryId",
             "platform_price", "platform_price_currency", inv["PlatformPrice"]),
            ("inventory._platform_discount_price#_money", "InventoryId",
             "platform_discount_price", "platform_discount_price_currency", inv["PlatformDiscountPrice"]),
            ("inventory._platform_winner_price#_money", "InventoryId",
             "platform_winner_price", "platform_winner_price_currency", inv["PlatformWinnerPrice"]),
            ("inventory._platform_winner_shipping_price#_money", "InventoryId",
             "platform_winner_shipping_price", "platform_winner_shipping_price_currency",
             inv["PlatformWinnerShippingPrice"]),
            ("inventory._platform_difference#_money", "InventoryId",
             "platform_difference", "platform_difference_currency", inv["PlatformDifference"]),
        ]
        for table, fk_col, amount_col, currency_col, value in money_fields:
            if value is not None:
                cur.execute(f"""
                    INSERT INTO "{table}" ({fk_col}, {amount_col}, {currency_col})
                    VALUES (?, ?, ?)
                """, (inv_id, str(value), CAD))
    conn.commit()
    print(f"  -> Inventory records: {len(inv_records)} (with BaseProperties + 9 Money VOs)")

    # ── 6. Inventory Items (IMEI linkage) ──────────────────────────────────
    print("\n[6/14] Seeding inventory items (IMEI linkages)...")
    inv_item_count = 0
    for inv_idx, inv_id in enumerate(inv_ids):
        inv = inv_records[inv_idx]
        qty = min(inv["Quantity"], 5)  # link up to 5 items per inventory
        for j in range(qty):
            s = stock_items[random.randint(0, len(stock_items) - 1)]
            cur.execute("""
                INSERT INTO inventory_item (InventoryId, Date, Sku, Model, Storage,
                                            Color, Grade, Cost, InvoiceNo, Imei,
                                            "Order", DateShip, Rma, Vendor,
                                            CreatedAtUtc, UpdatedAtUtc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (inv_id, random_past_date(60), s["Sku"], s["Model"],
                  s["Storage"], s["Color"], str(s["Grade"]), str(s["Cost"]),
                  s["InvoiceNumber"], s["Imei"], s["OrderNo"],
                  s["ShippedDate"], str(s["Rma"]), s["Vendor"], now, now))
            inv_item_count += 1
    conn.commit()
    print(f"  -> Inventory items: {inv_item_count}")

    # ── 7. Channel Mappings ────────────────────────────────────────────────
    print("\n[7/14] Seeding channel mappings...")
    ch_mappings = gen_channel_mappings(product_skus)
    for cm in ch_mappings:
        cur.execute("""
            INSERT INTO channel_mapping (SystemSKU, ChannelName, ChannelSKU, ShopSKU,
                                         CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (cm["SystemSKU"], cm["ChannelName"], cm["ChannelSKU"],
              cm["ShopSKU"], now, now))
    conn.commit()
    print(f"  -> Channel mappings: {len(ch_mappings)}")

    # ── 8. Inventory Events ────────────────────────────────────────────────
    print("\n[8/14] Seeding inventory events...")
    inv_events = gen_inventory_events(inv_ids, 80)
    for ev in inv_events:
        cur.execute("""
            INSERT INTO inventory_event (Channel, ChannelEventId, InventoryId,
                                         SystemSKU, Delta, Reason, OccurredAtUtc,
                                         CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (ev["Channel"], ev["ChannelEventId"], ev["InventoryId"],
              ev["SystemSKU"], ev["Delta"], ev["Reason"], ev["OccurredAtUtc"],
              now, now))
    conn.commit()
    print(f"  -> Inventory events: {len(inv_events)}")

    # ── 9. Notifications ───────────────────────────────────────────────────
    print("\n[9/14] Seeding notifications...")
    notifs = gen_notifications(15)
    for n in notifs:
        cur.execute("""
            INSERT INTO notification (Title, Message, Type, RelatedEntity,
                                      IsRead, CreatedBy, CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (n["Title"], n["Message"], n["Type"], n["RelatedEntity"],
              n["IsRead"], n["CreatedBy"], now, now))
    conn.commit()
    print(f"  -> Notifications: {len(notifs)}")

    # ── 10. Outgoing ───────────────────────────────────────────────────────
    print("\n[10/14] Seeding outgoing orders...")
    outgoings = gen_outgoing(stock_items, 30)
    for o in outgoings:
        cur.execute("""
            INSERT INTO outgoing (OrderNo, ProductTitle, Imei, Date, OrderStatus,
                                  CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (o["OrderNo"], o["ProductTitle"], o["Imei"], o["Date"],
              o["OrderStatus"], now, now))
    conn.commit()
    print(f"  -> Outgoing orders: {len(outgoings)}")

    # ── 11. Pending ────────────────────────────────────────────────────────
    print("\n[11/14] Seeding pending orders...")
    pendings = gen_pending(stock_items, 20)
    for p in pendings:
        cur.execute("""
            INSERT INTO pending (OrderNo, DateAdded, ProductTitle, Imei,
                                 CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (p["OrderNo"], p["DateAdded"], p["ProductTitle"], p["Imei"],
              now, now))
    conn.commit()
    print(f"  -> Pending orders: {len(pendings)}")

    # ── 12. Thread Messages + Responses + Statuses ─────────────────────────
    print("\n[12/14] Seeding thread messages, responses, statuses...")
    thread_msgs = gen_thread_messages(25)
    thread_ids = []
    for tm in thread_msgs:
        cur.execute("""
            INSERT INTO thread_message (ThreadId, OrderId, SenderName, Message,
                                        MessageDate, CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (tm["ThreadId"], tm["OrderId"], tm["SenderName"], tm["Message"],
              tm["MessageDate"], now, now))
        thread_ids.append(tm["ThreadId"])
    conn.commit()

    thread_resps = gen_thread_responses(thread_ids, 15)
    for tr in thread_resps:
        cur.execute("""
            INSERT INTO thread_response (ThreadId, OrderId, RespondedBy, Response,
                                         ResponseDate, Tag, ToType, TopicType,
                                         TopicValue, CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (tr["ThreadId"], tr["OrderId"], tr["RespondedBy"], tr["Response"],
              tr["ResponseDate"], tr["Tag"], tr["ToType"], tr["TopicType"],
              tr["TopicValue"], now, now))
    conn.commit()

    thread_statuses = gen_thread_statuses(thread_ids, 20)
    for ts in thread_statuses:
        cur.execute("""
            INSERT INTO thread_status (ThreadId, OrderId, Status,
                                       CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?)
        """, (ts["ThreadId"], ts["OrderId"], ts["Status"], now, now))
    conn.commit()
    print(f"  -> Thread messages: {len(thread_msgs)}, responses: {len(thread_resps)}, statuses: {len(thread_statuses)}")

    # ── 13. Stock Returns + Audit Logs + Snapshots + Idempotency Keys ──────
    print("\n[13/14] Seeding stock returns, audit logs, snapshots, idempotency keys...")
    stock_returns = gen_stock_returns(stock_items, 10)
    for sr in stock_returns:
        sid = random.choice(stock_ids)
        cur.execute("""
            INSERT INTO stock_return (StockId, ReturnOrderNo, ReturnDate, Reason,
                                      Channel, Quantity, Imei, Sku,
                                      CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sid, sr["ReturnOrderNo"], sr["ReturnDate"], sr["Reason"],
              sr["Channel"], sr["Quantity"], sr["Imei"], sr["Sku"], now, now))
    conn.commit()

    audit_logs = gen_audit_logs(20)
    for al in audit_logs:
        cur.execute("""
            INSERT INTO audit_log (CorrelationId, Module, Action, Status,
                                   EntityType, EntityKey, UserId, UserEmail,
                                   Endpoint, HttpMethod, ClientIp, DurationMs,
                                   CreatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (al["CorrelationId"], al["Module"], al["Action"], al["Status"],
              al["EntityType"], al["EntityKey"], al["UserId"], al["UserEmail"],
              al["Endpoint"], al["HttpMethod"], al["ClientIp"], al["DurationMs"], now))
    conn.commit()

    snapshots = gen_system_sku_snapshots(product_skus, 15)
    for snap in snapshots:
        cur.execute("""
            INSERT INTO system_sku_stock_snapshot (SystemSKU, LastKnownAvailable,
                                                   LastSyncUtc, CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?)
        """, (snap["SystemSKU"], snap["LastKnownAvailable"], snap["LastSyncUtc"], now, now))
    conn.commit()

    idem_keys = gen_idempotency_keys(10)
    for ik in idem_keys:
        cur.execute("""
            INSERT INTO idempotency_key ("Key", Success, Result, ProcessedAtUtc,
                                         CreatedAtUtc, UpdatedAtUtc)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ik["Key"], ik["Success"], ik["Result"], ik["ProcessedAtUtc"], now, now))
    conn.commit()
    print(f"  -> Stock returns: {len(stock_returns)}, Audit logs: {len(audit_logs)}, Snapshots: {len(snapshots)}, Idempotency keys: {len(idem_keys)}")

    # ── 14. Stock Sync Lock ────────────────────────────────────────────────
    print("\n[14/14] Seeding stock sync lock...")
    cur.execute("""
        INSERT INTO stock_sync_lock (LastSyncAtUtc, CreatedAtUtc, UpdatedAtUtc)
        VALUES (?, ?, ?)
    """, (random_past_date(1), now, now))
    conn.commit()
    print("  -> Stock sync lock: 1")

    # ── Final Row Count Verification ───────────────────────────────────────
    conn.execute("PRAGMA foreign_keys = ON")
    conn.commit()

    print("\n" + "=" * 70)
    print(" VERIFICATION — Row counts per table:")
    print("=" * 70)
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [r[0] for r in cur.fetchall()]
    total = 0
    for t in tables:
        cur.execute(f'SELECT COUNT(*) FROM "{t}"')
        cnt = cur.fetchone()[0]
        total += cnt
        print(f"  {t:55s} {cnt:>6d} rows")
    print(f"  {'TOTAL':55s} {total:>6d} rows")
    print("=" * 70)
    print(f"\n All users login with password: {DEFAULT_PASSWORD}")
    print(f" Admin: admin@vvs-ims.local / {DEFAULT_PASSWORD}")
    print(f" Matthew: matthew@vvs-ims.local / {DEFAULT_PASSWORD}")
    print("\n DONE — Restart the backend to pick up the new data!")
    print("=" * 70)

    conn.close()


if __name__ == "__main__":
    random.seed(42)  # Reproducible seed for consistent dev data
    seed_database()
