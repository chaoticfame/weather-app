const $ = id => document.getElementById(id);
const searchBtn = $('searchBtn');
const locBtn = $('locBtn');
const cityInput = $('cityInput');
const errorEl = $('error');

function showError(msg){ errorEl.textContent = msg; setTimeout(()=>{ errorEl.textContent = '' }, 6000); }
function formatTime(iso){ return new Date(iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }

function weatherName(code){
  const map={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Fog',51:'Light drizzle',61:'Rain',71:'Snow',80:'Rain showers'};
  return map[code]||('Code '+code);
}
function weatherIcon(code){
  const map={0:'01d',1:'02d',2:'03d',3:'04d',45:'50d',48:'50d',51:'09d',61:'10d',71:'13d',80:'09d'};
  return `https://openweathermap.org/img/wn/${map[code]||'01d'}@2x.png`;
}

function render(data){
  const city = data.city || '—';
  const cur = data.current;
  $('city').textContent = city;
  $('temp').textContent = Math.round(cur.temp)+'°C';
  $('desc').textContent = cur.weather[0].description;
  $('humidity').textContent = 'Humidity: '+(cur.humidity||'—');
  $('wind').textContent = 'Wind: '+(cur.wind_speed||'—')+' m/s';
  $('feels').textContent = Math.round(cur.feels_like)+'°C';
  $('pressure').textContent = cur.pressure||'—';
  $('visibility').textContent = cur.visibility||'—';
  $('sunrise').textContent = cur.sunrise ? formatTime(cur.sunrise) : '—';
  $('sunset').textContent = cur.sunset ? formatTime(cur.sunset) : '—';
  $('icon').src = cur.weather[0].icon;
  $('icon').alt = cur.weather[0].description;

  const forecastWrap = $('forecast'); forecastWrap.innerHTML = '';
  data.daily.forEach(d=>{
    const date = new Date(d.dt*1000);
    const dayName = date.toLocaleDateString([], {weekday:'short'});
    const el = document.createElement('div'); el.className='day';
    el.innerHTML = `<div class="small">${dayName}</div>
                    <div style="margin-top:6px"><img src="${d.weather[0].icon}" alt="" width="48" height="48"></div>
                    <div style="margin-top:6px;font-weight:700">${d.temp.max}°/${d.temp.min}°</div>
                    <div class="small" style="margin-top:6px">${d.weather[0].description}</div>`;
    forecastWrap.appendChild(el);
  });
}

async function fetchByCity(city){
  try{
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const g = await geo.json();
    if(!g.results || !g.results.length) throw new Error('City not found');
    const { latitude:lat, longitude:lon, name, country } = g.results[0];
    await fetchByCoords(lat, lon, name+', '+country);
  }catch(err){ showError(err.message); }
}

async function fetchByCoords(lat, lon, cityName=null){
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto`;
    const resp = await fetch(url);
    const json = await resp.json();
    const current = {
      temp: json.current_weather.temperature,
      weather: [{ description: weatherName(json.current_weather.weathercode), icon: weatherIcon(json.current_weather.weathercode) }],
      humidity: '—',
      wind_speed: json.current_weather.windspeed,
      pressure: '—',
      visibility: '—',
      sunrise: json.daily.sunrise ? new Date(json.daily.sunrise[0]) : null,
      sunset: json.daily.sunset ? new Date(json.daily.sunset[0]) : null,
      feels_like: json.current_weather.temperature
    };
    const daily = json.daily.time.slice(0,3).map((t,i)=>({
      dt: new Date(t).getTime()/1000,
      temp:{ max: json.daily.temperature_2m_max[i], min: json.daily.temperature_2m_min[i] },
      weather:[{ icon: weatherIcon(json.daily.weathercode[i]), description: weatherName(json.daily.weathercode[i]) }]
    }));
    render({ city: cityName || `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`, current, daily });
  }catch(err){ showError(err.message); }
}

searchBtn.addEventListener('click', ()=>{ const q=cityInput.value.trim(); if(!q){showError('Please enter a city name');return;} fetchByCity(q); });
cityInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') searchBtn.click(); });
locBtn.addEventListener('click', ()=>{
  if(!navigator.geolocation){ showError('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(pos=>{ fetchByCoords(pos.coords.latitude,pos.coords.longitude); }, err=>{ showError('Location permission denied'); });
});

$('themeBtn').addEventListener('click',()=>{ document.body.classList.toggle('light'); });

// initial sample render
render({
  city:'Manila',
  current:{ temp:29, feels_like:29, humidity:'78', wind_speed:3, pressure:'1008', visibility:'10km', weather:[{description:'Clear sky', icon:weatherIcon(0)}], sunrise:new Date(), sunset:new Date() },
  daily:[
    {dt:Date.now()/1000,temp:{max:30,min:26},weather:[{icon:weatherIcon(0),description:'Clear sky'}]},
    {dt:Date.now()/1000+86400,temp:{max:31,min:27},weather:[{icon:weatherIcon(1),description:'Mainly clear'}]},
    {dt:Date.now()/1000+172800,temp:{max:29,min:25},weather:[{icon:weatherIcon(2),description:'Partly cloudy'}]}
  ]
});