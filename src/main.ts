import "./styles.css";
import { PetController } from "./pet/controller";

window.addEventListener("DOMContentLoaded", async () => {
  const controller = new PetController();
  await controller.start();
});
