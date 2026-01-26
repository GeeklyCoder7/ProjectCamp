// Controller for getting all the projects for the current user
const getAllProjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const projects = await Project.find({
    "members.user": userId,
  })
    .select(
      "projectName status description projectOwner members createdAt updatedAt",
    )
    .skip(skip)
    .limit(limit)
    .sort({
      updatedAt: -1,
    });

  const totalProjects = await Project.countDocuments({
    "members.user": userId,
  });

  return res.status(200).json(
    new ApiResponse(200, {
      projectCount: totalProjects,
      totalProjects,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
      limit,
      projects,
    }),
  );
});