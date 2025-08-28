const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backendapp/.env' });

async function testConnection() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://shujaatmallick_db_user:MGxN1BJYvqgGWBLq@cluster0.masi7ho.mongodb.net/deployment-platform?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Testing MongoDB connection...');
    console.log('URI:', uri.replace(/:[^:@]*@/, ':****@')); // Hide password in logs
    
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('✅ Successfully connected to MongoDB Atlas!');
        
        // Test database access
        const db = client.db('deployment-platform');
        const collections = await db.listCollections().toArray();
        console.log('📁 Database: deployment-platform');
        console.log('📚 Collections:', collections.map(c => c.name).join(', ') || 'No collections yet');
        
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    } finally {
        await client.close();
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});