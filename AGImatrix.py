from langchain.agents import Tool

nvidia_tool = Tool(
    name="NVIDIA AI Integration",
    func=your_nvidia_function,  # fx en wrapper om REST-call
    description="Forbinder til NVIDIA AI for inferens, modellink eller analyse."
)
tools.append(nvidia_tool)
