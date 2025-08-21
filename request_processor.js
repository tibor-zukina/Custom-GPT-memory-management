export function getMemoryAccessParams(request) {
   return {
    user: request.authUser,
    gptId: request.params.gptId,
    memoryPath: getMemoryPath(request.params.gptId),
    memoryPayload: request.body?.memory
  };
}

export function getFileAccessParams(request) {
  return {
    gptId: request.params.gptId,
    filename: request.params.filename,
    user: request.authUser,
    filePath: getFilePath(request.params.gptId, request.params.filename),
    fileData: request.body?.content
  };
}

export function getAdminGPTUpdateParams(request) {
  const gptId = request.params.gptId;
  const { shared_memories, description } = request.body;
  return {
    gptId,
    shared_memories,
    description,
    isValid: (Array.isArray(shared_memories) && description)
  };
}

export function getAdminGPTCreateParams(request) {
   const { id, name, shared_memories} = request.body;
    return {
    id,
    name,
    shared_memories,
    isValid: (id  &&  name)
  };
}

export function returnJSONResponse(res, data) {
  res.json({ success: true, data });
}

export function returnErrorResponse(res, errorMessage, errorCode = RESPONSE_CODES.INTERNAL_SERVER_ERROR) {
  return res.status(errorCode).json({ success: false, message: errorMessage });
}
