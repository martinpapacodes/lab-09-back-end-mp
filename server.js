'use strict';

require('dotenv').config();

const PORT = process.env.PORT || 3030;
const express = require('express');
const app = express();
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

app.use(cors());


const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', error => console.error(error));

function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

function Weather(forecast, time) {
  this.forecast = forecast;
  this.time = time;
}

function Event(link, name, event_date, summary) {
  this.link = link;
  this.name = name;
  this.event_date = event_date;
  this.summary = summary;
}

function dbSearch(DB, location) {
  const query = client.query(DB, [location]);
  if (query.rowCount) {
    return query.rows;
  }
}

function checkLocationDB(request, response) {
  const db = 'SELECT * FROM locations WHERE search_query = $1';
  let checkResult = dbSearch(db, request)
  if (checkResult) {
    response.send(checkResult[0]);
  }
}


function storeNewLocation(location) {
  let locationObj = `INSERT INTO locations (
    search_query, 
    formatted_query,
    latitude,
    longitude
    )VALUES(
      $1,
      $2,
      $3,
      $4
    )RETURNING id`;
  let locationProperties = [location.search_query, location.formatted_query, location.latitude, location.longitude];
  client.query(locationObj, locationProperties).then(console.log('New location stored successfully!--------------------------'));
}

function getLocation(request, response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;
  // let searchResult = checkLocationDB(request.query.data, response)
  superagent.get(url).then(data => {
    // const geoData = data.body;
    const geoData = data.body;
    const city = request.query.data;
    const locationData = new Location(city, geoData);
    storeNewLocation(locationData, city);
    response.status(200).send(locationData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  });
}

function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  superagent.get(url).then(data => {
    
    const weatherData = data.body.daily.data.map(obj => {
      let forecast = obj.summary;
      let formattedTime = new Date(obj.time * 1000).toDateString();
      return new Weather(forecast, formattedTime);
    })
    response.status(200).send(weatherData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  });
}

function getEventBrite(request, response) {
  const url = `http://api.eventful.com/json/events/search?location=${request.query.data.formatted_query}&app_key=${process.env.EVENTBRITE_API_KEY}`;
  superagent.get(url).then(data => {
    const parsedData = JSON.parse(data.text);
    const eventData = parsedData.events.event.map(data => {
      const link = data.url;
      const name = data.title;
      const event_date = new Date(data.start_time).toDateString();
      const summary = data.description;
      return new Event(link, name, event_date, summary);
    })
    response.status(200).send(eventData);
  }).catch(err => {
    console.error(err);
    response.status(500).send('Status 500: Internal Server Error');
  })
}

function getMovies(request, response) {

};
app.get('/', (request, response) => {
  response.send('Home Page');
});

app.get('/location', getLocation);

app.get('/weather', getWeather);

app.get('/events', getEventBrite);

// app.get('/movies', getMovies);


client.connect().then(() => {app.listen(PORT, () => console.log(`The server is up listening on ${PORT}`));});