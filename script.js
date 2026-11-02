// =====================================
// BREATHEEASY
// Live Air Quality & Weather Application
// =====================================

// Default location: Agartala, Tripura
let latitude = 23.8315;
let longitude = 91.2868;

let searchTimeout;
let selectedCity = null;
let suggestionRequestNumber = 0;
let dashboardRequestNumber = 0;

// Update HTML elements
function showValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// Display messages
function showMessage(message) {
    showValue("search-message", message);
}

// AQI status
function getAQIStatus(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
}

// Weather description
function getWeatherDescription(code) {
    const descriptions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Foggy",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Heavy drizzle",
        61: "Light rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Light snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",
        80: "Rain showers",
        81: "Moderate rain showers",
        82: "Heavy rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with heavy hail"
    };

    return descriptions[code] || "Weather conditions unavailable";
}

// Health tips based on AQI
function updateHealthTips(aqi) {
    if (aqi == null) {
        showValue("health-title", "Stay Air Aware");
        showValue("health-tip", "Air quality information is currently unavailable.");
    } else if (aqi <= 50) {
        showValue("health-title", "Air Quality is Good");
        showValue("health-tip", "Enjoy outdoor activities. Air quality is generally satisfactory.");
    } else if (aqi <= 100) {
        showValue("health-title", "Air Quality is Moderate");
        showValue("health-tip", "Most people can enjoy outdoor activities. Sensitive individuals should take care.");
    } else if (aqi <= 150) {
        showValue("health-title", "Protect Sensitive Groups");
        showValue("health-tip", "Children and people with asthma should limit prolonged outdoor exertion.");
    } else if (aqi <= 200) {
        showValue("health-title", "Unhealthy Air Quality");
        showValue("health-tip", "Consider reducing outdoor activities. Sensitive individuals should avoid prolonged exertion.");
    } else if (aqi <= 300) {
        showValue("health-title", "Very Unhealthy Air");
        showValue("health-tip", "Avoid prolonged outdoor activities. Consider wearing a well-fitting mask outdoors.");
    } else {
        showValue("health-title", "Hazardous Air Quality");
        showValue("health-tip", "Avoid outdoor activities and keep windows closed where practical.");
    }
}

// Display hourly AQI forecast
function displayForecast(hourlyData, currentTime) {
    const forecastList = document.getElementById("forecast-list");

    if (!forecastList) return;

    forecastList.innerHTML = "";

    if (!hourlyData || !hourlyData.time || !hourlyData.us_aqi) {
        forecastList.textContent = "Forecast unavailable.";
        return;
    }

    const startIndex = hourlyData.time.findIndex(
        time => time >= currentTime
    );

    if (startIndex === -1) {
        forecastList.textContent = "Forecast unavailable.";
        return;
    }

    const futureHours = hourlyData.time
        .slice(startIndex, startIndex + 6)
        .map((time, index) => ({
            time: time,
            aqi: hourlyData.us_aqi[startIndex + index]
        }));

    futureHours.forEach(item => {
        const card = document.createElement("div");
        card.className = "forecast-item";

        const timeText = document.createElement("p");
        timeText.textContent = item.time.slice(11, 16);

        const aqiText = document.createElement("h4");
        aqiText.textContent =
            item.aqi != null ? Math.round(item.aqi) : "--";

        const label = document.createElement("p");
        label.textContent = "US AQI";

        card.appendChild(timeText);
        card.appendChild(aqiText);
        card.appendChild(label);

        forecastList.appendChild(card);
    });
}

// Load air quality
async function loadAirQuality(requestNumber) {
    const url =
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5,pm10&hourly=us_aqi&forecast_days=1&timezone=auto`;

    try {
        showValue("aqi-status", "Loading...");

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to fetch air quality data.");
        }

        const data = await response.json();

        // Ignore results belonging to an older location
        if (requestNumber !== dashboardRequestNumber) return;

        const current = data.current;

        if (!current) {
            throw new Error("Current air quality data unavailable.");
        }

        const aqi = current.us_aqi;

        showValue("aqi-value",
            aqi != null ? Math.round(aqi) : "--");

        showValue("aqi-status",
            aqi != null ? getAQIStatus(aqi) : "Unavailable");

        updateHealthTips(aqi);

        showValue("pm25",
            current.pm2_5 != null ? Number(current.pm2_5).toFixed(1) : "--");

        showValue("pm10",
            current.pm10 != null ? Number(current.pm10).toFixed(1) : "--");

        showValue("update-time", "Last updated: " + current.time);

        displayForecast(data.hourly, current.time);

    } catch (error) {
        if (requestNumber !== dashboardRequestNumber) return;

        console.error("Air Quality Error:", error);

        showValue("aqi-value", "--");
        showValue("aqi-status", "Data unavailable");
        updateHealthTips(null);
        showValue("pm25", "--");
        showValue("pm10", "--");
        showValue("update-time", "Unable to load air quality data.");

        const forecastList = document.getElementById("forecast-list");

        if (forecastList) {
            forecastList.textContent = "Forecast unavailable.";
        }
    }
}

// Load weather
async function loadWeather(requestNumber) {
    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to fetch weather data.");
        }

        const data = await response.json();

        // Ignore results belonging to an older location
        if (requestNumber !== dashboardRequestNumber) return;

        const current = data.current;

        if (!current) {
            throw new Error("Weather information unavailable.");
        }

        showValue("temperature", current.temperature_2m + "°C");
        showValue("humidity", current.relative_humidity_2m + "%");
        showValue("wind", current.wind_speed_10m + " km/h");

        showValue(
            "weather-description",
            getWeatherDescription(current.weather_code)
        );

    } catch (error) {
        if (requestNumber !== dashboardRequestNumber) return;

        console.error("Weather Error:", error);

        showValue("temperature", "--°C");
        showValue("humidity", "--%");
        showValue("wind", "-- km/h");
        showValue("weather-description", "Weather unavailable");
    }
}

// Load the dashboard for the current coordinates
async function loadDashboard() {
    const requestNumber = ++dashboardRequestNumber;

    showValue("aqi-value", "...");
    showValue("aqi-status", "Loading...");
    showValue("temperature", "...");
    showValue("humidity", "--%");
    showValue("wind", "-- km/h");
    showValue("weather-description", "Loading weather...");

    await Promise.all([
        loadAirQuality(requestNumber),
        loadWeather(requestNumber)
    ]);
}

// Hide city suggestions
function hideSuggestions() {
    const box = document.getElementById("city-suggestions");

    if (box) {
        box.innerHTML = "";
        box.style.display = "none";
    }
}

// Format city name and location
function getCityDisplayName(city) {
    const originalName = city.name.trim().toLowerCase();

    const displayName =
        ["bangalore", "bangalur", "bengaluru"].includes(originalName)
            ? "Bengaluru"
            : city.name.trim();

    return [
        displayName,
        city.admin1,
        city.country
    ].filter(Boolean).join(", ");
}

// Select a city
async function selectCity(city) {
    if (!city || city.latitude == null || city.longitude == null) {
        showMessage("Unable to select this city. Please try again.");
        return;
    }

    // Use the selected city's coordinates
    latitude = city.latitude;
    longitude = city.longitude;

    selectedCity = city;

    const cityInput = document.getElementById("city-input");

    if (cityInput) {
        cityInput.value = getCityDisplayName(city).split(",")[0];
    }

    // Update location heading
    showValue("location", getCityDisplayName(city));

    hideSuggestions();

    showMessage("Loading readings for " + getCityDisplayName(city) + "...");

    await loadDashboard();

    // Avoid showing an old message after another location is selected
    if (selectedCity === city) {
        showMessage("Showing readings for " + getCityDisplayName(city) + ".");
    }
}

// Get city suggestions from Open-Meteo
async function getCitySuggestions(query) {
    const box = document.getElementById("city-suggestions");

    if (!box) return;

    const requestNumber = ++suggestionRequestNumber;

    try {
        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=100&language=en&format=json&countryCode=IN`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Suggestion search failed.");
        }

        const data = await response.json();

        if (requestNumber !== suggestionRequestNumber) return;

        const cities = (data.results || []).filter(
            city => city.country_code === "IN"
        );

        box.innerHTML = "";

        if (cities.length === 0) {
            const message = document.createElement("div");
            message.className = "suggestion-item";
            message.textContent = "No matching Indian cities found.";
            box.appendChild(message);
            box.style.display = "block";
            return;
        }

        cities.slice(0, 10).forEach(city => {
            const item = document.createElement("div");

            item.className = "suggestion-item";
            item.textContent = getCityDisplayName(city);

            item.addEventListener("mousedown", function (event) {
                event.preventDefault();

                // Prevent pending suggestions from appearing again
                suggestionRequestNumber++;

                selectCity(city);
            });

            box.appendChild(item);
        });

        box.style.display = "block";

    } catch (error) {
        console.error("Suggestion Error:", error);

        if (requestNumber === suggestionRequestNumber) {
            hideSuggestions();
        }
    }
}

// Search for a city
async function searchCity(cityName) {
    const city = cityName.trim();

    if (!city) {
        showMessage("Please enter a city name.");
        return;
    }

    if (!navigator.onLine) {
        showMessage("You are offline. Connect to the internet to search.");
        return;
    }

    // Use the exact selected suggestion when it matches the input
    if (
        selectedCity &&
        getCityDisplayName(selectedCity).split(",")[0].toLowerCase() === city.toLowerCase()
    ) {
        await selectCity(selectedCity);
        return;
    }

    selectedCity = null;

    showMessage("Searching for " + city + "...");

    try {
        const url =
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=100&language=en&format=json&countryCode=IN`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("City search failed.");
        }

        const data = await response.json();

        const indianCities = (data.results || []).filter(
            result => result.country_code === "IN"
        );

        if (indianCities.length === 0) {
            showMessage("City not found. Check the spelling or choose a suggestion.");
            return;
        }

        const searchText = city.toLowerCase();

        const result =
            indianCities.find(item =>
                item.name.toLowerCase() === searchText
            ) ||
            indianCities.find(item =>
                item.name.toLowerCase().startsWith(searchText)
            ) ||
            indianCities[0];

        await selectCity(result);

    } catch (error) {
        console.error("City Search Error:", error);
        showMessage("Unable to search. Check your internet connection.");
    }
}

// Get device's current location
function getMyLocation() {
    if (!navigator.geolocation) {
        showMessage("Your browser does not support location services.");
        return;
    }

    if (!navigator.onLine) {
        showMessage("Connect to the internet to load live readings.");
        return;
    }

    // Invalidate pending city suggestion results
    suggestionRequestNumber++;
    selectedCity = null;

    showMessage("Getting your current device location...");

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            // Use only the device's GPS coordinates
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;

            const cityInput = document.getElementById("city-input");

            if (cityInput) {
                cityInput.value = "";
            }

            hideSuggestions();

            showValue("location", "Your Current Location");

            showMessage("Location found. Loading readings...");

            await loadDashboard();

            showMessage("Showing readings for your current location.");
        },

        function (error) {
            console.error("Location Error:", error);

            if (error.code === error.PERMISSION_DENIED) {
                showMessage("Location permission denied. Search for a city instead.");
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                showMessage("Your device location is unavailable. Please try again.");
            } else if (error.code === error.TIMEOUT) {
                showMessage("Location request timed out. Please try again.");
            } else {
                showMessage("Unable to get location. Please try city search.");
            }
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// Start the application
document.addEventListener("DOMContentLoaded", function () {

    if (navigator.onLine) {
        loadDashboard();
    } else {
        showMessage("You are offline. Live readings need internet.");

        showValue("aqi-value", "--");
        showValue("aqi-status", "Offline");
        showValue("temperature", "--°C");
        showValue("weather-description", "Connect to the internet for weather data.");

        updateHealthTips(null);
    }

    const searchForm = document.getElementById("city-search-form");
    const cityInput = document.getElementById("city-input");

    // Autocomplete while typing
    if (cityInput) {
        cityInput.addEventListener("input", function () {
            const query = cityInput.value.trim();

            selectedCity = null;
            clearTimeout(searchTimeout);

            if (query.length < 2) {
                suggestionRequestNumber++;
                hideSuggestions();
                return;
            }

            if (!navigator.onLine) {
                hideSuggestions();
                return;
            }

            searchTimeout = setTimeout(function () {
                getCitySuggestions(query);
            }, 350);
        });
    }

    // Search form submission
    if (searchForm) {
        searchForm.addEventListener("submit", function (event) {
            event.preventDefault();

            clearTimeout(searchTimeout);
            suggestionRequestNumber++;
            hideSuggestions();

            if (cityInput) {
                searchCity(cityInput.value);
            }
        });
    }

    // My Location button
    const locationButton = document.getElementById("locationBtn");

    if (locationButton) {
        locationButton.addEventListener("click", function (event) {
            event.preventDefault();
            getMyLocation();
        });
    }

    // Close suggestions when clicking outside the search form
    document.addEventListener("click", function (event) {
        if (!event.target.closest("#city-search-form")) {
            hideSuggestions();
        }
    });

    // Internet connection changes
    window.addEventListener("offline", function () {
        suggestionRequestNumber++;
        hideSuggestions();
        showMessage("Internet connection lost. Live readings may not update.");
    });

    window.addEventListener("online", function () {
        showMessage("Internet restored. Refreshing readings...");
        loadDashboard();
    });
});