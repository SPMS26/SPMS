const db = require('../config/database');

/**
 * Service to manage dynamic system settings stored in PostgreSQL
 */
const settingService = {
  /**
   * Get raw string setting value from database
   */
  async getSetting(key, defaultValue = null) {
    try {
      const res = await db.query('SELECT value FROM system_settings WHERE key = $1', [key]);
      if (res.rows.length > 0) {
        return res.rows[0].value;
      }
      return defaultValue;
    } catch (err) {
      console.error(`[SettingService] Failed to read setting '${key}':`, err.message);
      return defaultValue;
    }
  },

  /**
   * Get numeric setting value from database
   */
  async getNumericSetting(key, defaultValue = 0) {
    const rawVal = await this.getSetting(key, defaultValue);
    const num = parseFloat(rawVal);
    return isNaN(num) ? defaultValue : num;
  },

  /**
   * Set or update setting value in database
   */
  async setSetting(key, value, description = null) {
    const res = await db.query(
      `INSERT INTO system_settings (key, value, description, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, system_settings.description),
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, String(value), description]
    );
    return res.rows[0];
  }
};

module.exports = settingService;
