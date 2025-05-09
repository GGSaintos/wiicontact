let map;
let markers = [];

window.onload = () => {
  map = L.map('map').setView([40.7, -74], 11); // Default center (NYC)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  for (const contact of contacts) {
    if (contact.Latitude && contact.Longitude) {
      const marker = L.marker([contact.Latitude, contact.Longitude])
        .addTo(map)
        .bindPopup(`<b>${contact.FirstName} ${contact.LastName}</b><br>${contact.Street}, ${contact.City}`);
      markers.push({
        lat: contact.Latitude,
        lng: contact.Longitude,
        marker
      });
    }
  }
};

function flyToLocationFromElement(event, el) {
    event.preventDefault(); // Prevent link default
  
    const address = el.textContent.trim();
  
    // Use Nominatim to geocode the address
    axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1
      }
    })
    .then(response => {
      if (response.data.length > 0) {
        const lat = parseFloat(response.data[0].lat);
        const lon = parseFloat(response.data[0].lon);
  
        if (!isNaN(lat) && !isNaN(lon)) {
          // Add marker and fly to it
          const marker = L.marker([lat, lon])
            .addTo(map)
            .bindPopup(`<b>Located:</b><br>${address}`)
            .openPopup();
  
          map.flyTo([lat, lon], 15);
        }
      } else {
        alert("Address not found.");
      }
    })
    .catch(error => {
      console.error("Geocoding error:", error);
      alert("Failed to locate the address.");
    });
}