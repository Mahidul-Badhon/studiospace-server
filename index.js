import express from "express"
import { MongoClient, ObjectId } from 'mongodb';
import cors from "cors"
import 'dotenv/config'


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

app.post('/add-studio', async(req, res) =>{
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

app.get('/studios/:id', async(req, res) =>{
    const {id} = req.params
    const result = await studioCollection.findOne({_id: new ObjectId(id)})
    res.send(result)
})

app.post('/bookings', async(req, res) =>{
    try {
    const { studioId, bookingDate, startTime, hours } = req.body;

    // Check collision against pending or confirmed bookings
    const existingBooking = await bookingCollection.findOne({
      studioId: studioId,
      bookingDate: bookingDate,
      startTime: startTime,
      status: { $in: ["Confirmed", "Pending"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        message: "Change time! It's already booked.",
      });
    }

    const result = await bookingCollection.insertOne(req.body);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Booking Error:", error);
    return res.status(500).json({
      message: "Server error while processing booking: " + error.message,
    });
  }
})

// http://localhost:8000
app.get('/', (req, res) =>{
    res.send({message: 'server is running fine!'})
})

app.listen(PORT, () =>{
    console.log(`server is running at ${PORT}`)
})