import { Menu } from "@models/menu.model";

export const verticalMenuItems = [
    // Menu items visible to both roles
    // new Menu(1, 'Offers', '/view/offer', null, 'tachometer', null, false, 0, [1, 2]),
    new Menu(2, 'Inventory', '/view/inventory', null, 'cubes', null, false, 0, [1, 2]),
    new Menu(20, 'Input', null, null, 'table', null, true, 0, [1, 2]),
    new Menu(3, 'IMEI Input', '/view/inputform', null, 'pencil-square-o', null, false, 20, [1, 2]),
    new Menu(19, 'Non-IMEI Input', '/view/serialinputform', null, 'pencil-square-o', null, false, 20, [1, 2]),
    new Menu(4, 'Unsold', '/view/unsold', null, 'cubes', null, false, 0, [1, 2]),
    new Menu(5, 'Outgoing', '/view/outgoing', null, 'share-square-o', null, false, 0, [1, 2]),
    new Menu(18, 'Sold', '/view/sold', null, 'cubes', null, false, 0, [1, 2]),
    new Menu(8, 'Pending', '/view/pendingstock', null, 'cubes', null, false, 0, [1, 2]),
    // new Menu(22, 'Order Received', '/view/orderreceived', null, 'shopping-cart', null, false, 0, [1, 2]),
    new Menu(21, 'Chatbot', '/view/chatbot', null, 'comments', null, false, 0, [1, 2]),
    new Menu(16, 'SKU Mapping', '/view/skumapping', null, 'retweet', null, false, 0, [1, 2]),
    // new Menu(15, 'Channels', '/view/channels', null, 'cube', null, false, 0, [1, 2]),

    new Menu(15, 'Reports', null, null, 'file-text-o', null, true, 0, [1]),
    new Menu(17, 'Product Variant Report', '/view/report', null, 'file-text', null, false, 15, [1]),
    // new Menu(189, 'Offers', '/view/offers', null, 'file-text', null, false, 15, [1]),

    // Administrator section - only for admin (roleId=1)
    new Menu(6, 'Administrator', null, null, 'file-text-o', null, true, 0, [1]),
    new Menu(7, 'Users', '/view/register', null, 'registered', null, false, 6, [1]),
    new Menu(13, 'SKU', '/view/sku', null, 'cubes', null, false, 6, [1]),

    new Menu(9, 'Master', null, null, 'table', null, true, 0, [1]),
    new Menu(10, 'Models', '/view/models', null, 'mobile', null, false, 9, [1]),
    new Menu(11, 'Storage', '/view/storage', null, 'database', null, false, 9, [1]),
    new Menu(12, 'Colors', '/view/colors', null, 'circle', null, false, 9, [1]),
    new Menu(14, 'Grades', '/view/grades', null, 'star', null, false, 9, [1]),
];

export const horizontalMenuItems = [
    // Menu items visible to both roles
    // new Menu(1, 'Offers', '/view/offer', null, 'tachometer', null, false, 0, [1, 2]),
    new Menu(2, 'Inventory', '/view/inventory', null, 'cubes', null, false, 0, [1, 2]),
    new Menu(20, 'Input', null, null, 'table', null, true, 0, [1, 2]),
    new Menu(3, 'IMEI Input', '/view/inputform', null, 'pencil-square-o', null, false, 20, [1, 2]),
    new Menu(19, 'Non-IMEI Input', '/view/serialinputform', null, 'pencil-square-o', null, false, 20, [1, 2]),
    new Menu(4, 'Unsold', '/view/unsold', null, 'cubes', null, false, 0, [1, 2]),
    // new Menu(4, 'Unsold Products', '/view/stock', null, 'cubes', null, false, 0, [1, 2]),
    new Menu(5, 'Outgoing', '/view/outgoing', null, 'share-square-o', null, false, 0, [1, 2]),
    new Menu(18, 'Sold', '/view/sold', null, 'cubes', null, false, 0, [1, 2]),
    new Menu(8, 'Pending', '/view/pendingstock', null, 'cubes', null, false, 0, [1, 2]),
    // new Menu(22, 'Order Received', '/view/orderreceived', null, 'shopping-cart', null, false, 0, [1, 2]),
    new Menu(21, 'Chatbot', '/view/chatbot', null, 'comments', null, false, 0, [1, 2]),
    new Menu(16, 'SKU Mapping', '/view/skumapping', null, 'retweet', null, false, 0, [1, 2]),
    // new Menu(15, 'Channels', '/view/channels', null, 'cube', null, false, 0, [1, 2]),

    new Menu(15, 'Reports', null, null, 'file-text-o', null, true, 0, [1]),
    new Menu(17, 'Product Variant Report', '/view/report', null, 'file-text', null, false, 15, [1]),
    //new Menu(18, 'Offers', '/view/offers', null, 'file-text', null, false, 15, [1]),

    // Administrator section - only for admin (roleId=1)
    new Menu(6, 'Administrator', null, null, 'file-text-o', null, true, 0, [1]),
    new Menu(7, 'Users', '/view/register', null, 'registered', null, false, 6, [1]),
    new Menu(13, 'SKU', '/view/sku', null, 'cubes', null, false, 6, [1]),

    new Menu(9, 'Master', null, null, 'table', null, true, 0, [1]),
    new Menu(10, 'Models', '/view/models', null, 'mobile', null, false, 9, [1]),
    new Menu(11, 'Storage', '/view/storage', null, 'database', null, false, 9, [1]),
    new Menu(12, 'Colors', '/view/colors', null, 'circle', null, false, 9, [1]),
    new Menu(14, 'Grades', '/view/grades', null, 'star', null, false, 9, [1]),
]

