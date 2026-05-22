import { searchService } from "../services/search.service";
import { asyncHandler } from "../utils/async-handler";
import { sendSuccess } from "../utils/api-response";

type SearchQuery = {
  q: string;
  type: "all" | "communities" | "posts" | "users" | "tags";
  page?: number;
  limit?: number;
};

export const searchController = {
  search: asyncHandler(async (req, res) => {
    const result = await searchService.search(req.query as unknown as SearchQuery);
    return sendSuccess(res, 200, "Search results fetched", result);
  }),
};
