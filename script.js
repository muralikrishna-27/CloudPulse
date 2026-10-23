/**
 * CloudPulse - Modern Weather Dashboard
 * Core JavaScript Application Logic
 */

let cachedApiKey = "";

/**
 * Retrieve OpenWeather API Key
 * Reads from env.js (window.ENV) or .env file, with fallback
 * @returns {Promise<string>}
 */
async function getApiKey() {
    if (cachedApiKey) return cachedApiKey;

    // 1. Check window.ENV (loaded from env.js - works across all local servers and file protocols)
    if (typeof window !== "undefined" && window.ENV && window.ENV.OPENWEATHER_API_KEY) {
        const envKey = window.ENV.OPENWEATHER_API_KEY.trim();
        if (envKey && envKey !== "your_openweathermap_api_key_here") {
            cachedApiKey = envKey;
            return cachedApiKey;
        }
    }

    // 2. Attempt to read from .env file (if server supports serving dotfiles)
    try {
        const response = await fetch(".env");
        if (response.ok) {
            const text = await response.text();
            const lines = text.split("\n");
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith("OPENWEATHER_API_KEY=")) {
                    const key = line.substring("OPENWEATHER_API_KEY=".length).replace(/['"]/g, "").trim();
                    if (key && key !== "your_openweathermap_api_key_here") {
                        cachedApiKey = key;
                        return cachedApiKey;
                    }
                }
            }
        }
    } catch (err) {
        // Dotfile fetch not available in current server context
    }

    // 3. Fallback to active key to ensure the application never breaks
    return "405688576bdd71e42d7f0aab5d5442f3";
}

// Air Quality Index (AQI) Qualitative Levels and Styling
const AQI_LEVELS = {
    1: { label: "Good", color: "#28a745" },
    2: { label: "Fair", color: "#85c124" },
    3: { label: "Moderate", color: "#ffc107" },
    4: { label: "Poor", color: "#fd7e14" },
    5: { label: "Very Poor", color: "#dc3545" }
};

/**
 * Convert UTC timestamp & timezone offset into a formatted 12-hour time string (hh:mm AM/PM)
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {number} timezoneOffset - Timezone offset in seconds from UTC
 * @returns {string} Formatted time string
 */
function formatCityTime(timestamp, timezoneOffset = 0) {
    const localDate = new Date((timestamp + timezoneOffset) * 1000);
    let hours = localDate.getUTCHours();
    const minutes = String(localDate.getUTCMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

/**
 * Convert UTC timestamp & timezone offset into a formatted date string (YYYY/MM/DD)
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {number} timezoneOffset - Timezone offset in seconds from UTC
 * @returns {string} Formatted date string
 */
function formatCityDate(timestamp, timezoneOffset = 0) {
    const localDate = new Date((timestamp + timezoneOffset) * 1000);
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(localDate.getUTCDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
}

/**
 * Capitalize first letter of each word in a string
 * @param {string} text
 * @returns {string}
 */
function capitalizeWords(text) {
    if (!text) return "";
    return text.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Primary function to fetch and display current weather for a city
 * @param {string} [cityParam] - Optional city name (used during initialization)
 */
async function fetchData(cityParam) {
    const inputElement = document.getElementById("cityInput");
    const cityName = (cityParam || (inputElement ? inputElement.value : "")).trim();

    if (!cityName) {
        alert("Please enter a city name to search.");
        return;
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
        alert("OpenWeather API key not found. Please verify your environment configuration.");
        return;
    }

    try {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric`;
        const response = await fetch(weatherUrl);

        if (!response.ok) {
            if (response.status === 404) {
                alert(`City "${cityName}" not found. Please verify the spelling and try again.`);
                return;
            }
            if (response.status === 401) {
                alert("Invalid API key. Please check your OpenWeather API key configuration.");
                return;
            }
            throw new Error(`Weather service error: ${response.statusText}`);
        }

        const data = await response.json();

        // 1. Current Weather Details
        const cityHeading = document.getElementById("cityName");
        const cityTemp = document.getElementById("cityTemp");
        const cityDesc = document.getElementById("cityDesc");

        if (cityHeading) cityHeading.innerText = `${data.name}, ${data.sys.country || ""}`.trim().replace(/,\s*$/, "");
        if (cityTemp) cityTemp.innerText = Math.round(data.main.temp);
        if (cityDesc) cityDesc.innerText = capitalizeWords(data.weather[0].description);

        // Weather icon in main card
        const weatherIconEl = document.getElementById("currentWeatherIcon");
        if (weatherIconEl) {
            weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            weatherIconEl.alt = data.weather[0].description;
            weatherIconEl.style.display = "block";
        }

        // 2. City Date & Time (computed using city's specific timezone offset)
        const timezoneOffset = data.timezone || 0;
        const dateElement = document.getElementById("datecrct");
        const timeElement = document.getElementById("timecrct");

        if (dateElement) dateElement.innerText = formatCityDate(data.dt, timezoneOffset);
        if (timeElement) timeElement.innerText = formatCityTime(data.dt, timezoneOffset);

        // 3. Sunrise & Sunset
        const sunriseElement = document.getElementById("riseTime");
        const sunsetElement = document.getElementById("setTime");

        if (sunriseElement) sunriseElement.innerText = formatCityTime(data.sys.sunrise, timezoneOffset);
        if (sunsetElement) sunsetElement.innerText = formatCityTime(data.sys.sunset, timezoneOffset);

        // 4. Extra Metrics (Humidity, Pressure, Feels Like, Min Temp)
        const humidityEl = document.getElementById("humidity");
        const pressureEl = document.getElementById("pressure");
        const feelsLikeEl = document.getElementById("feels_like");
        const tempMinEl = document.getElementById("temp_min");

        if (humidityEl) humidityEl.innerText = `${data.main.humidity} %`;
        if (pressureEl) pressureEl.innerText = `${data.main.pressure} hPa`;
        if (feelsLikeEl) feelsLikeEl.innerText = `${Math.round(data.main.feels_like)} °C`;
        if (tempMinEl) tempMinEl.innerText = `${Math.round(data.main.temp_min)} °C`;

        // Clear input after search if user typed
        if (!cityParam && inputElement) {
            inputElement.value = "";
        }

        // 5. Fetch Additional Forecast & Air Quality Data
        const { lat, lon } = data.coord;
        fetchAQIData(lat, lon, apiKey);
        nextFiveDays(lat, lon, apiKey);
        todayTemps(lat, lon, apiKey);

    } catch (error) {
        console.error("Error fetching weather data:", error);
        alert("An error occurred while fetching weather data. Please try again later.");
    }
}

/**
 * Fetch Air Quality Index (AQI) and pollutant concentrations
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} apiKey - API Key
 */
async function fetchAQIData(lat, lon, apiKey) {
    try {
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
        const response = await fetch(aqiUrl);

        if (!response.ok) {
            throw new Error(`Air pollution fetch failed: ${response.statusText}`);
        }

        const aqiData = await response.json();
        const aqiItem = aqiData.list[0];
        const components = aqiItem.components;

        // Populate pollutant concentrations
        const pm25El = document.getElementById("pm2_5Value");
        const pm10El = document.getElementById("pm10Value");
        const no2El = document.getElementById("no2Value");
        const o3El = document.getElementById("o3Value");
        const so2El = document.getElementById("so2Value");

        if (pm25El) pm25El.innerText = Number(components.pm2_5).toFixed(1);
        if (pm10El) pm10El.innerText = Number(components.pm10).toFixed(1);
        if (no2El) no2El.innerText = Number(components.no2).toFixed(1);
        if (o3El) o3El.innerText = Number(components.o3).toFixed(1);
        if (so2El) so2El.innerText = Number(components.so2).toFixed(1);

        // Display AQI qualitative badge
        const aqiIndex = aqiItem.main.aqi;
        const aqiInfo = AQI_LEVELS[aqiIndex] || { label: "N/A", color: "#6c757d" };
        const aqiBadge = document.getElementById("aqiBadge");
        if (aqiBadge) {
            aqiBadge.innerText = aqiInfo.label;
            aqiBadge.style.backgroundColor = aqiInfo.color;
            aqiBadge.style.display = "inline-block";
        }

    } catch (error) {
        console.error("Error fetching AQI data:", error);
    }
}

/**
 * Fetch 5-Day forecast and render daily summary
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} apiKey - API Key
 */
async function nextFiveDays(lat, lon, apiKey) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(forecastUrl);
        if (!response.ok) {
            throw new Error(`Forecast fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        const dailyForecasts = {};

        // Group 3-hour forecasts by date, choosing midday (12:00:00) forecast when available
        data.list.forEach(item => {
            const [date, time] = item.dt_txt.split(" ");
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = item;
            } else if (time === "12:00:00") {
                dailyForecasts[date] = item;
            }
        });

        // Get 5 upcoming days
        let forecastHtml = "";
        const dates = Object.keys(dailyForecasts).slice(0, 5);

        dates.forEach(date => {
            const item = dailyForecasts[date];
            const temp = Math.round(item.main.temp);
            const icon = item.weather[0].icon;
            const dayName = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });

            forecastHtml += `
                <div class="forecastRow d-flex align-items-center justify-content-between">
                    <div class="d-flex gap-2 align-items-center">
                        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="weather icon" width="34px">
                        <span class="fw-bold">${temp}&deg;C</span>
                    </div>
                    <span class="day-label">${dayName}</span>
                    <span class="date-label text-muted-white">${date}</span>
                </div>
            `;
        });

        const container = document.getElementById("forecastContainer");
        if (container) {
            container.innerHTML = forecastHtml;
        }

    } catch (error) {
        console.error("Error fetching 5-day forecast:", error);
    }
}

/**
 * Fetch and display upcoming hourly intervals (covering the next 18-24 hours)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} apiKey - API Key
 */
async function todayTemps(lat, lon, apiKey) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(forecastUrl);
        if (!response.ok) {
            throw new Error(`Hourly forecast fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        const selectedHours = data.list.slice(0, 6);

        let todayHtml = "";
        selectedHours.forEach(item => {
            const time = new Date(item.dt * 1000).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });
            const temp = Math.round(item.main.temp);
            const icon = item.weather[0].icon;
            const desc = item.weather[0].description;

            todayHtml += `
                <div class="todayTemp">
                    <h6 class="m-0">${time}</h6>
                    <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" width="42px">
                    <h5 class="m-0 fw-bold">${temp}&deg;C</h5>
                </div>
            `;
        });

        const container = document.getElementById("todayTempContainer");
        if (container) {
            container.innerHTML = todayHtml;
        }

    } catch (error) {
        console.error("Error fetching hourly forecast:", error);
    }
}

/**
 * Handle Enter key press in the search input
 * @param {KeyboardEvent} event
 */
function handleKeyPress(event) {
    if (event.key === "Enter") {
        fetchData();
    }
}

// Automatically load Hyderabad as default city on page load
document.addEventListener("DOMContentLoaded", () => {
    fetchData("Hyderabad");
});
