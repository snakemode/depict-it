
module.exports = async function (context, req) {


    const imageUrl = `https://depictit.blob.core.windows.net/shareables/${req.query.id}.gif`

    const template = `
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <title>Depict-it</title>

    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="Description" content="The hilarious online game of draw and describe.">
    <meta name="theme-color" content="#17B5E9">

    <link rel="stylesheet" href="/style.css" />
    <link rel="icon" type="image/png" href="/assets/icons/favicon.ico">

    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Depict-It" />
    <meta name="twitter:site" content="@DepictItGame" />
    <meta name="twitter:creator" content="@DepictItGame" />
    <meta name="twitter:description" content="A hilarious online game of draw and describe." />
    <meta name="twitter:image" content="${imageUrl}" />
</head>

<body>
    <main>
        <div id="card">
            <p id="copy">
                Here's a great card
            </p>
            <img src="${imageUrl}" />
        </div>
    </main>
    <footer class="footer">
        Powered by <a href="https://ably.com" class="ably">Ably</a>
    </footer>
</body>

</html>
`;


    context.res = {
        headers: { "content-type": "text/html" },
        body: template
    };
};