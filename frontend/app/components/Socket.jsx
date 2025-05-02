"use client"
import io from "socket.io-client";


import React from 'react'

const Socket = () => {
    const socket = io("http://localhost:5050");
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    socket.on('chat message', (msg) => {
      console.log('Message: ' + msg)
    });
  return (
    <div>
      
    </div>
  )
}

export default Socket


