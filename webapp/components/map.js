import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from 'react-leaflet'
import { connect, credsAuthenticator, JSONCodec } from "nats.ws";
import { useEffect, useState } from 'react';

let initCreds = true
const jc = new JSONCodec()

export default function Map() {
  const center = [40.7128, -74.0060]

  const [login, setLogin] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [creds, setCreds] = useState(window.sessionStorage.getItem("creds"))
  const [connError, setConnError] = useState(null)
  const [connState, setConnState] = useState("closed")
  const [inventory, setInventory] = useState({})
  
  useEffect(() => {
    if (initCreds) {
      initCreds = false
      if (creds) {
        doConnect(creds, setConnError)
      }
    }
  })

  const subscribe = async function () {
    try {
      for await (const msg of window.nc.subscribe("inventory.update")) {
        if (msg.data) {
          const data = jc.decode(msg.data)
          const newData = {}
          newData[`${data.name}`] = data
          setInventory(prevInventory => Object.assign({}, prevInventory, newData))
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const waitClosed = async function () {
    try {
      await window.nc.closed()
      setConnState("closed")
    } catch (err) {
      setConnState("closed")
      if (err.message) {
        setConnError(err.message)
      }
    }

  }

  const doConnect = async function (creds, errorSetter, successCb) {
    if (window.nc) {
      window.nc.close()
      await window.nc.closed()
    }
    errorSetter(null)
    setConnState("connecting")
    try {
      window.nc = await connect(
        {
          servers: "wss://connect.ngs.global",
          authenticator: credsAuthenticator(new TextEncoder().encode(creds)),
        },
      )
      setConnState("connected")
      if (successCb) {
        successCb()
      }
      subscribe()
      waitClosed()
    } catch (err) {
      setConnState("closed")
      errorSetter(err.message)
    }
  }

  const doLogout = function() {
    nc = null
    window.sessionStorage.removeItem("creds")
    setCreds(null)
  }

  const doLogin = async function() {
    const creds = document.getElementById("creds").value
    await doConnect(creds, setLoginError, () => {
      setLoginError(null)
      window.sessionStorage.setItem("creds", creds)
      setCreds(document.getElementById("creds"))
      setLogin(false)
    })
  }

  const cancelLogin = function() {
    setLoginError(null)
    setLogin(false)
  }

  return(
    <>
      <div style={{position: "absolute", right:0, top: 0, zIndex:1000, padding: "5px"}}>
        <div style={{textAlign: "right", padding: "2px" }}>
          <span style={{backgroundColor: "#fff", color: "#663300", padding: "2px"}}>Edgy Coffee</span>
        </div>
        <>
        {
          creds
          ? 
            <>
              <div style={{textAlign: "right", padding: "2px"}}>
                {
                  connState == "closed"
                  ? <button onClick={() => doConnect(creds, setConnError)}>Reconnect</button>
                  : <></>
                }
                {
                  connState == "connected"
                  ? <button onClick={() => window.nc.close()}>Disconnect</button>
                  : <></>
                }
                <button onClick={() => doLogout()}>Logout</button>
              </div>
              <div style={{textAlign: "right", padding: "2px"}}>
                ngs: {connState}
              </div>
              {
                connError
                ? <div style={{color: "#900", textAlign: "right", padding: "2px"}}>{connError}</div>
                : <></>
              }
            </>
          : 
          <div style={{textAlign: "right", padding: "2px"}}>
            <button onClick={() => setLogin(true)}>Login</button>
          </div>
        }
        </>
      </div>
      {
        login
        ? 
          <div style={{position: "absolute", right:0, top: 0, zIndex:1001, padding: "5px", width: "300px", backgroundColor: "#fff"}}>
          <div>
            Creds: 
          </div>
          <div>
            <textarea style={{width: "100%", height: "100px"}} id="creds"></textarea>
          </div>
          <div>
            <button onClick={() => doLogin()}>Login</button>
            <button onClick={() => cancelLogin()}>Cancel</button>
          </div>
          {
            loginError
            ? <div style={{color: "#900"}}>{loginError}</div>
            : <div></div>
          }
        </div>
        : <div></div>
      }
      
      <MapContainer style={{height: "100vh"}} center={center} zoom={3} scrollWheelZoom={true}>
        <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {
          Object.values(inventory).map((val) => 
            <Marker key={val.name} position={[val.lat, val.lon]}>
              <Popup>
                <strong>{val.name}</strong>
                <br />
                <span>Type: </span>
                <span>{val.type}</span>
                <br />
                <span>Bags of Coffee: </span>
                <span>{val.quantity}</span>
              </Popup>
            </Marker>
          )
        }
      </MapContainer>
    </>
  )
}