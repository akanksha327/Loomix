import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { validate } from "../middleware/validate.middleware";
import { searchQuerySchema } from "../validators/search.validator";

const router = Router();

router.get("/", validate({ query: searchQuerySchema }), searchController.search);

export default router;
