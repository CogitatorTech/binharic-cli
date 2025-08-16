import app from "./app.js";
import env from "./config.js";

// PORT is now a validated number from our config file
const PORT = env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
