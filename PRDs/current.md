
I need to create a connection to our CRM system.  While my system will be in the GCC High Zure, We will make a outbound pipeline to be able to make API request to our current CRM system.  And we need to be able to use the system with our agents.  Pretty much means this means we need to make a tool which we can then provide later to our agents for use. I wanna create the tool now.  I'm not sure if the tool should be almost an MCP kind of approach but really we need to know what tool to use and when.

Make sure you are using my current folder layout where agents are their own files folders, and where tools become the room as well within the tools folders. I'm keeping a separation concerns between agents and tools.

The agent we will need to make will be a Landgraf agent. You need to research for the latest documentation to make sure that implemnt this correctly.  

let's start small by only implementing things which are able to query and ask questions about customers and the current status of pipelines. We don't need to add updates right now. Just read only and for customers and pipeline.  Make sure you expose enough API to make things interesting.


DocumenatioN:
Insightly API:  https://api.na1.insightly.com/v3.1/swagger/docs/v3.1
API full docs:  https://api.insightly.com/v3.1/Help

Use the Internet to make sure you're doing clean code and nothing crazy.

 the tool should be independently testable 
 

