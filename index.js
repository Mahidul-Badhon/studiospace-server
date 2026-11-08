import express from "express"
import { MongoClient, ObjectId } from 'mongodb';
import cors from "cors"
import 'dotenv/config'
import { jwtVerify, createRemoteJWKSet } from "jose";


const app = express()
const PORT = 8000
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}


const mongoClient = await connectToMongoDB()

const db = mongoClient.db("studio-space")
const studioCollection = db.collection("studios")
const bookingCollection = db.collection("bookings")

const verifyApi = async(req, res, next) =>{
  const authHeader = req.headers.authorization
  if(!authHeader){
    return res.status(401).send({msg: "unauthorized"})
  }
  const token = authHeader.split(" ")[1]
  if(!token){
    return res.status(401).send({msg: "unauthorized"})
  }

  const JWKS = createRemoteJWKSet(
      new URL('http://localhost:3000/api/auth/jwks')
    )
    try {
      const {payload} = await jwtVerify(token, JWKS)
      next()
    } catch (error) {
      return res.status(500).send({msg: "Server error!"})
    }
    // console.log(payload)
  // console.log(token)
  
}

app.post('/add-studio', verifyApi, async(req, res) =>{
    console.log("Api Called!!")
    const data = req.body
    const result = await studioCollection.insertOne(data)
    console.log(result)
    res.send(result)
})

app.get('/studios', async(req, res)=>{
    const result = await studioCollection.find().toArray()
    res.send(result)
})
// app.get('/studios/:id', verifyApi,async(req, res) =>{
//     const {id} = req.params
//     const result = await studioCollection.findOne({_id: new ObjectId(id)})
//     res.send(result)
// })



app.get("/studios/:id",verifyApi, async (req, res) => {
  const { id } = req.params;

  // If the ID isn't a valid 24-character hex string, exit early
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ message: "Studio not found" });
  }

  const result = await studioCollection.findOne({ _id: new ObjectId(id) });
  if (!result) {
    return res.status(404).json({ message: "Studio not found" });
  }

  res.send(result);
});

app.delete('/mybookings/:id', verifyApi, async(req, res) =>{
    const {id} = req.params
    const result = await bookingCollection.deleteOne({_id: new ObjectId(id)})
    res.send(result)
})

app.patch('/mystudios/:id',verifyApi, async(req, res) =>{
  const {id} = req.params
  const updateData = req.body
  const result = await studioCollection.updateOne(
    {_id: new ObjectId(id)},
    {$set: updateData}
  )
  res.json(result)
})

app.delete('/mystudios/:id', verifyApi, async(req, res) =>{
    const {id} = req.params
    const result = await studioCollection.deleteOne({_id: new ObjectId(id)})
    res.send(result)
})


//checking time collision between bookings
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}
app.post('/bookings', verifyApi, async(req, res) =>{
    try {
    const { studioId, bookingDate, startTime, hours } = req.body;

    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = newStartMinutes + Number(hours) * 60;

    const existingBookings = await bookingCollection
      .find({
        studioId: studioId,
        bookingDate: bookingDate,
        status: { $in: ["Confirmed", "Pending"] },
      }).toArray();

    const hasCollision = existingBookings.some((booking) => {
      const existingStart = timeToMinutes(booking.startTime);
      const existingEnd = existingStart + Number(booking.hours) * 60;
      return existingStart < newEndMinutes && existingEnd > newStartMinutes;
    });

    if (hasCollision) {
      return res.status(409).json({
        message: "Time slot conflict! Another booking overlaps with these hours.",
      });
    }

    const result = await bookingCollection.insertOne(req.body);
    return res.status(201).json({
      success: true,
      result,
    });

  } catch (error) {
    console.error("Booking Error:", error);
    return res.status(500).json({
      message: "Server error while processing booking: " + error.message,
    });
  }
})

app.get('/my-bookings/:email',verifyApi, async(req, res) =>{
    const {email} = req.params
    const result = await bookingCollection.find({email:email}).toArray()
    res.send(result)
})

app.get('/featured-studios', async(req, res) =>{
  const result = await studioCollection.find().limit(6).toArray()
    res.send(result)
})

app.get('/my-studios/:email',verifyApi, async(req, res) =>{
    const {email} = req.params
    const result = await studioCollection.find({ownerEmail:email}).toArray()
    res.send(result)
})

// http://localhost:8000/my-studios/:email
app.get('/', (req, res) =>{
    res.send({message: 'server is running fine!'})
})

app.listen(PORT, () =>{
    console.log(`server is running at ${PORT}`)
})