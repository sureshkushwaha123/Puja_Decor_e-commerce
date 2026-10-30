# Address location lookup

The Add Shipping Address page uses the browser's geolocation API only after the user presses **Use My Current Location**. Coordinates are sent to the backend and used for a reverse lookup with Photon; latitude and longitude are not saved with customer addresses.

No API key is required. The backend defaults to the Photon demo API at `https://photon.komoot.io`. To use a self-hosted Photon instance, set the optional server-side environment variable `PHOTON_API_BASE_URL` to its base URL, for example `https://geocoder.example.com`. Do not prefix this with `/reverse`; the backend adds that endpoint itself. This variable is not exposed to the browser.

Photon permits reasonable use of its demo server and may throttle excessive traffic. The page performs one lookup per explicit user action and displays OpenStreetMap attribution. For sustained commercial traffic, use a provider or Photon instance with capacity appropriate to the application. Geolocation requires a secure context (HTTPS in production; localhost is allowed during development).
