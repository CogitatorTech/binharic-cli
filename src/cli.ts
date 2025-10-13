import React from "react";
import { render } from "ink";
import App from "./ui/App.js";
import logger from "./logger.js";

logger.info("Tobi application started.");

render(React.createElement(App));
