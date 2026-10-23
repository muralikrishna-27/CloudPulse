/**
 * CloudPulse - Environment Configuration Template
 * Duplicate this file as 'env.js' and insert your OpenWeatherMap API key.
 */
const ENV = {
    OPENWEATHER_API_KEY: "your_openweathermap_api_key_here"
};

if (typeof window !== "undefined") {
    window.ENV = ENV;
}
