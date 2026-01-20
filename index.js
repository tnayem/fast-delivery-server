const express = require('express');
const SSLCommerzPayment = require('sslcommerz-lts')
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
const store_id = process.env.STORE_ID
const store_passwd = process.env.STORE_PASS
const is_live = false //true for live, false for sandbox
async function run() {
    try {
        await client.connect();
        const db = client.db("parcelDb")
        const parcelCollection = db.collection('parcels');
        const orderCollection = db.collection('orders')

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
                const id = req.params.id
                let query = {}
                if (email) {
                    query = { created_by: email }
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
        // Get spacific data using id 
        app.get('/parcels/:id', async (req, res) => {
            const id = req.params.id
            const data = { _id: new ObjectId(id) }
            const result = await parcelCollection.findOne(data)
            res.send(result)
        })
        // ✅ DELETE parcel
        app.delete('/parcels/:id', async (req, res) => {
            const id = req.params.id;
            const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });
        // Payment Method 
        
        app.post("/order", async (req, res) => {
            const tran_id = new ObjectId().toString()
            const productTrackingId = req.body.tracking_Id
            const product = await parcelCollection.findOne({ tracking_Id: productTrackingId })
            const data = {
                total_amount: product?.totalPrice,
                currency: 'BDT',
                tran_id: tran_id, // use unique tran_id for each api call
                success_url: `http://localhost:5000/payment/success/${tran_id}`,
                fail_url: 'http://localhost:3030/fail',
                cancel_url: 'http://localhost:3030/cancel',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: 'Computer.',
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: 'Customer Name',
                cus_email: 'customer@example.com',
                cus_add1: product?.senderAddress,
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01711111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };

            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL
                res.send({ url: GatewayPageURL })
                const finalOrder = {
                    product,
                    paidStatus: false,
                    transitationId: tran_id
                }
                const result = orderCollection.insertOne(finalOrder)
                console.log('Redirecting to: ', GatewayPageURL)
            });

        })
        app.post('/payment/success/:tranId', async (req, res) => {
            console.log(req.params.tranId);
            const result = await orderCollection.updateOne({ transitationId: req.params.tranId },
                {
                    $set: {
                        paidStatus: true,
                    }
                })
            if (result.modifiedCount > 0) {
                res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
            }
        })

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
