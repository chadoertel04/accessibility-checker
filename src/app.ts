import express, { Express } from "express";
import dotenv from "dotenv";
import path from "path";
import * as routes from "./routes";

dotenv.config();

// Server Initialization
const app: Express = express();
const PORT = process.env.PORT;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/img", express.static(path.join(__dirname, "public/images")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

routes.register(app);

// start the express server
app.listen(PORT, () => {
	console.log("Server is Successfully Running, and App is listening on port " + PORT);
});
