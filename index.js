const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_password}@cluster0.etjzxzd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const parcelCollection = client.db('parcelDb').collection('parcels');

        // ✅ POST parcel
        app.post('/parcels', async (req, res) => {
            const data = req.body;
            data.creation_date = new Date();
            const result = await parcelCollection.insertOne(data);
            res.send(result);
        });

        // ✅ GET specific user parcels (latest first)
        app.get('/parcels', async (req, res) => {
            try {
                const email = req.query.email;
                let query = {}
                if (email) {
                    query = {created_by: email}
                }

                const result = await parcelCollection
                    .find(query)
                    .sort({ creation_date: -1 })
                    .toArray();

                res.status(200).send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to load parcels' });
            }
        });

        // ✅ DELETE parcel
        app.delete('/parcels/:id', async (req, res) => {
            const id = req.params.id;
            const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        console.log('MongoDB connected');
    } finally { }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Parcel API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
