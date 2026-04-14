import { taskQueryService } from "./tasks/taskQueryService";
import { taskMutationService } from "./tasks/taskMutationService";
import { taskActivityService } from "./tasks/taskActivityService";

export const taskService = {
  ...taskQueryService,
  ...taskMutationService,
  ...taskActivityService,
};
