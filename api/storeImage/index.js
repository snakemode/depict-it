const { StorageSharedKeyCredential } = require("@azure/storage-blob");
const { BlobServiceClient } = require("@azure/storage-blob");
    
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}  

module.exports = async function (context, req) {
    
    const defaultAzureCredential = new StorageSharedKeyCredential(process.env.AZURE_ACCOUNT, process.env.AZURE_KEY);
    const blobServiceClient = new BlobServiceClient(process.env.AZURE_BLOBSTORAGE, defaultAzureCredential);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINERNAME);

    // Generate unique filename and upload
    const unique = `game_${req.body.gameId}_${uuidv4()}`;

    const blockBlobClient = containerClient.getBlockBlobClient(unique);
    const uploadBlobResponse = await blockBlobClient.upload(req.body.imageData, req.body.imageData.length || 0);

    context.res = { 
        headers: { "content-type": "application/json" },
        body: {
            url: `${process.env.AZURE_BLOBSTORAGE}/${process.env.AZURE_CONTAINERNAME}/${unique}`
        }
    };    
};