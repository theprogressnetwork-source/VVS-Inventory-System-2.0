using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using VvsIms.Application.Services;
using VvsIms.Infrastructure.Services;

namespace VvsIms.Infrastructure.Services
{
    /// <summary>
    /// Amazon platform service implementation with environment-based credentials.
    /// </summary>
    public class AmazonPlatformService : IPlatformService
    {
        public string PlatformName => "Amazon";

        private readonly EnvironmentSecretProvider _secretProvider;
        private readonly HttpClient _httpClient;

        public AmazonPlatformService(EnvironmentSecretProvider secretProvider, HttpClient httpClient)
        {
            _secretProvider = secretProvider;
            _httpClient = httpClient;
        }

        public async Task<List<PlatformOrderDto>> FetchNewOrdersAsync(CancellationToken ct = default)
        {
            // Implementation will be added
            throw new NotImplementedException();
        }

        public async Task<bool> UpdateInventoryAsync(string sku, int quantity, CancellationToken ct = default)
        {
            // Implementation will be added
            throw new NotImplementedException();
        }

        public async Task<bool> AcknowledgeOrderAsync(string orderId, CancellationToken ct = default)
        {
            // Implementation will be added
            throw new NotImplementedException();
        }

        public async Task<decimal?> GetListingPriceAsync(string sku, CancellationToken ct = default)
        {
            // Implementation will be added
            throw new NotImplementedException();
        }
    }
}