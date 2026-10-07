using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Sanad.Api.Data;
using Sanad.Api.Models;

namespace Sanad.Api.Services;

public class SettingsService : ISettingsService
{
    private readonly SanadDbContext _db;

    public SettingsService(SanadDbContext db)
    {
        _db = db;
    }

    public async Task<Dictionary<string, string>> GetSettingsAsync()
    {
        var settings = await _db.UserSettings.ToListAsync();
        return settings.ToDictionary(s => s.Key, s => s.Value);
    }

    public async Task SetSettingAsync(string key, string value)
    {
        var setting = await _db.UserSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting == null)
        {
            setting = new UserSetting { Key = key, Value = value };
            _db.UserSettings.Add(setting);
        }
        else
        {
            setting.Value = value;
        }

        await _db.SaveChangesAsync();
    }
}