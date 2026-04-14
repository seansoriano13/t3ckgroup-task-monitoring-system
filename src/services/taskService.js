import { taskQueryService } from "./tasks/taskQueryService";
import { taskMutationService } from "./tasks/taskMutationService";

export const taskService = {
  ...taskQueryService,
  ...taskMutationService,
};
