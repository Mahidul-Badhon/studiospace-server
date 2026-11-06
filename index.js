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

app.delete('/mybookings/:id', async(req, res) =>{
    const {id} = req.params
    const result = await bookingCollection.deleteOne({_id: new ObjectId(id)})
    res.send(result)
})


//checking time collision between bookings
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}
app.post('/bookings', async(req, res) =>{
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
    return res.status(201).json(result);

  } catch (error) {
    console.error("Booking Error:", error);
    return res.status(500).json({
      message: "Server error while processing booking: " + error.message,
    });
  }
})

app.get('/my-bookings/:email', async(req, res) =>{
    const {email} = req.params
    const result = await bookingCollection.find({email:email}).toArray()
    res.send(result)
})

// http://localhost:8000
app.get('/', (req, res) =>{
    res.send({message: 'server is running fine!'})
})

app.listen(PORT, () =>{
    console.log(`server is running at ${PORT}`)
})