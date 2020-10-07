const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT
const publicDirectory = path.join(__dirname, '../public')

app.use(express.static(publicDirectory))

io.on('connection', (socket) => {
    console.log('New Websocket connection')
     
    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        if(!user){
            return callback('Error sending message')
        }
        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    socket.on('sendLocation', ({lat,long}, callback) => {
        const user = getUser(socket.id)
        if(!user){
            return callback('Error sending location')
        }
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, lat,long))
        callback()
    })

    socket.on('join', ({username, room}, callback) => {
        const {error,user} = addUser({id:socket.id, username, room})

        if(error){
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin Chatbot','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin Chatbot', 'A new user has joined.'))

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin Chatbot',`${user.username} has disconnected.`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log('Server is up on port ' + port)
})