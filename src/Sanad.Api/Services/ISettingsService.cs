using System.Collections.Generic;
using System.Threading.Tasks;

namespace Sanad.Api.Services;

public interface ISettingsService
{
    /// <summary>All user settings as a key/value dictionary.</summary>
    Task<Dictionary<string, string>> GetSettingsAsync();

    /// <summary>Creates or updates a single setting.</summary>
    Task SetSettingAsync(string key, string value);
}