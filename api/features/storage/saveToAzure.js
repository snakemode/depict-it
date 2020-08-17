const { StorageSharedKeyCredential } = require("@azure/storage-blob");
const { BlobServiceClient } = require("@azure/storage-blob");
const checkConfig = require("../checkConfiguration");

module.exports = async function (filename, buffer) {
    checkConfig(["AZURE_ACCOUNT", "AZURE_KEY", "AZURE_BLOBSTORAGE", "AZURE_CONTAINERNAME"]);

    if (!filename) {
        throw "Cannot save to Azure as no filename was provided.";
    }

    if (!buffer) {
        throw "No data to save to Azure. Buffer is undefined.";
    }

    const unique = filename;
    const url = `${process.env.AZURE_BLOBSTORAGE}/${process.env.AZURE_CONTAINERNAME}/${unique}`;

    if (process.env.SKIP_AZURE_UPLOADS) {
        return "skipped";
    }

    const defaultAzureCredential = new StorageSharedKeyCredential(process.env.AZURE_ACCOUNT, process.env.AZURE_KEY);
    const blobServiceClient = new BlobServiceClient(process.env.AZURE_BLOBSTORAGE, defaultAzureCredential);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINERNAME);

    const blockBlobClient = containerClient.getBlockBlobClient(unique);
    const uploadBlobResponse = await blockBlobClient.upload(buffer, buffer.length || 0);

    return url;
};