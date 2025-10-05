/* draws (cubic) bezier curve between start and end points via svg paths
- can add input nodes at (50, 50)
- can add process nodes ## output isn't working. [3]

*/

/*
[1]TODO:
[2]TODO:
[3]TODO: also assign this to the wamgpt.py file almost always?
[4]TODO: wamgpt.py needs to output text somehow. wtf?

Framework minimal. pls work.

*/

// Pyodide setup
// Pyodide setup
let pyodide = null;
let pyodideReady = false;
let pyodideLoading = false; // i'm having issues. need to check bugs.

async function loadPyodide() {
  if (pyodideLoading || pyodideReady) {
    return;
  }
  
  pyodideLoading = true;
  console.log('Loading Pyodide...');
  
  try {
    // Use the promise that was started in index.html
    pyodide = await window.pyodideReadyPromise;
    console.log('Pyodide loaded successfully');
    
    // Load numpy package
    await pyodide.loadPackage('numpy');
    console.log('Numpy loaded');
    
    // Load your wamgpt.py file
    const response = await fetch('wamble_gpt/wamgpt_v2.py');
    const pythonCode = await response.text();
    await pyodide.runPythonAsync(pythonCode);
    
    pyodideReady = true;
    pyodideLoading = false;
    console.log('Pyodide ready! wamgpt.py loaded.');
  } catch (error) {
    console.error('Error loading Pyodide:', error);
    pyodideLoading = false;
  }
}

// Start loading Pyodide when page loads
loadPyodide();
    



let nodes = [
  { id: 1, type: 'input', x: 100, y: 100, content: '' },
  { id: 2, type: 'process', x: 350, y: 100 }
];
let edges = [];
let nodeIdCounter = 3;

let dragging = null;
let dragOffset = { x: 0, y: 0 };
let connecting = null;
let tempEdge = null;

const nodeLayer = document.getElementById('nodeLayer');
const edgeLayer = document.getElementById('edgeLayer');


//  create path using cubic beizier cube. 
// {p0, p1, p2, p3} = {(x1, y1),(x1+offset,y1),(x2-offfset, y2),(x2,y2)} = {(star),(weight1),(weight2),(end)}
// 
function createBezierPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const offset = Math.min(dx / 2, 100);
  return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;
}

function getPortPosition(nodeId, portType) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  
  const x = node.x + (portType === 'output' ? 150 : 0);
  const y = node.y + 25;
  return { x, y };
}

function renderEdges() {
  edgeLayer.innerHTML = '';
  
  edges.forEach(edge => {
    const from = getPortPosition(edge.from, 'output');
    const to = getPortPosition(edge.to, 'input');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', createBezierPath(from.x, from.y, to.x, to.y));
    path.setAttribute('stroke', 'red'); // defines svg stroke and color
    path.setAttribute('stroke-width', '2'); // width = n = 2
    path.setAttribute('stroke-dasharray', '10, 5');
    path.setAttribute('fill', 'none');
    edgeLayer.appendChild(path);
  });
  
  if (tempEdge) { // fix later
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', createBezierPath(tempEdge.x1, tempEdge.y1, tempEdge.x2, tempEdge.y2));
    path.setAttribute('stroke', 'red');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.5');
    edgeLayer.appendChild(path);
  }
}

function createNodeElement(node) { // create generic node as a div, later use button click as input or process node.
  const nodeEl = document.createElement('div');
  nodeEl.className = 'node';
  nodeEl.style.left = `${node.x}px`;
  nodeEl.style.top = `${node.y}px`;
  nodeEl.dataset.nodeId = node.id;
  
  // Create node label
  const label = document.createElement('div');
  label.textContent = node.type === 'input' ? 'Input' : 'Process';
  label.style.marginBottom = '5px';
  nodeEl.appendChild(label);
  
  if (node.type === 'input') { // if user_input decides type = "input", then assign port output-port
    // Add textarea for input nodes
    const textarea = document.createElement('textarea');
    textarea.style.width = '130px';
    textarea.style.height = '60px';
    textarea.style.resize = 'none';
    textarea.placeholder = 'Enter text...';
    textarea.value = node.content || '';
    textarea.dataset.nodeId = node.id;
    
    // Save content when typing
    textarea.addEventListener('input', (e) => {
      const n = nodes.find(n => n.id === node.id);
      if (n) n.content = e.target.value;
    });
    
    // Prevent dragging when clicking textarea
    textarea.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    nodeEl.appendChild(textarea);
    
    const outputPort = document.createElement('div');
    outputPort.className = 'port output-port'; // only port output-port. input-port does not exist for this node.
    outputPort.dataset.nodeId = node.id;
    outputPort.dataset.portType = 'output';
    nodeEl.appendChild(outputPort);
  }
  
  if (node.type === 'process') {
    // Add output display area
    const outputDiv = document.createElement('div');
    outputDiv.className = 'output-display';
    outputDiv.dataset.nodeId = node.id;
    outputDiv.style.width = '130px';
    outputDiv.style.height = '60px';
    outputDiv.style.overflow = 'auto';
    outputDiv.style.backgroundColor = '#fff';
    outputDiv.style.padding = '5px';
    outputDiv.style.fontSize = '11px';
    outputDiv.style.marginBottom = '5px';
    outputDiv.textContent = 'Output will appear here...';
    nodeEl.appendChild(outputDiv);
    
    // Add a button to process inputs
    const processBtn = document.createElement('button');
    processBtn.textContent = 'Process';
    processBtn.style.marginTop = '5px';
    processBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      processNode(node.id);
    });
    nodeEl.appendChild(processBtn);
    
    const inputPort = document.createElement('div');
    inputPort.className = 'port input-port';
    inputPort.dataset.nodeId = node.id;
    inputPort.dataset.portType = 'input';
    nodeEl.appendChild(inputPort);
    
    const outputPort = document.createElement('div');
    outputPort.className = 'port output-port';
    outputPort.dataset.nodeId = node.id;
    outputPort.dataset.portType = 'output';
    nodeEl.appendChild(outputPort);
  }
  
  return nodeEl;
}

// Process node function - runs Python with input text
async function processNode(processNodeId) {
  if (!pyodideReady) {
    console.log('Pyodide is still loading... please wait');
    return;
  }
  
  // Find all edges that connect to this process node
  const incomingEdges = edges.filter(e => e.to === processNodeId);
  
  if (incomingEdges.length === 0) {
    console.log('No inputs connected to this process node');
    return;
  }
  
  // Get all input nodes connected to this process node
  const inputNodes = incomingEdges.map(edge => {
    return nodes.find(n => n.id === edge.from);
  }).filter(n => n && n.type === 'input');
  
  if (inputNodes.length > 0) {
    console.log('Text file detected: True');
    
    // Combine all input text
    const combinedInput = inputNodes.map(n => n.content || '').join(' ');
    
    if (!combinedInput.trim()) {
      console.log('Input is empty!');
      return;
    }
    
    try {
      // Run Python function with input text
      const pythonCode = `generate_text("""${combinedInput}""", 100)`;
      const output = await pyodide.runPythonAsync(pythonCode);
      
      console.log('Python output:', output);
      
      // Display output in the process node
      const outputDiv = document.querySelector(`.output-display[data-node-id="${processNodeId}"]`);
      if (outputDiv) {
        outputDiv.textContent = output;
      }
      
    } catch (error) {
      console.error('Python error:', error);
    }
    
    return true;
  } else {
    console.log('Text file detected: False');
    return false;
  }
}

function renderNodes() {
  nodeLayer.innerHTML = '';
  nodes.forEach(node => {
    const nodeEl = createNodeElement(node);
    nodeLayer.appendChild(nodeEl);
  });
}


// add a Node at (x, y)
function addNode(type) {
  const newNode = {
    id: nodeIdCounter++,
    type,
    x: 50,
    y: 50
  };
  
  if (type === 'input') {
    newNode.content = '';
  }
  
  nodes.push(newNode);
  renderNodes();
  renderEdges();
}


// when mouse click is held down, 
function handleMouseDown(e) {
  const target = e.target;
  
  if (target.classList.contains('port')) {
    const nodeId = parseInt(target.dataset.nodeId);
    const portType = target.dataset.portType;
    
    if (portType === 'output') {
      const pos = getPortPosition(nodeId, portType);
      connecting = { nodeId, portType, x: pos.x, y: pos.y };
    }
    return;
  }
  

  const nodeEl = target.closest('.node'); // variable 
  if (nodeEl) {
    const nodeId = parseInt(nodeEl.dataset.nodeId);
    const node = nodes.find(n => n.id === nodeId);
    dragging = nodeId;
    dragOffset = {
      x: e.clientX - node.x,
      y: e.clientY - node.y
    };
  }
}



function handleMouseMove(e) { // function triviall moves node to new x, y coordinates
  if (dragging !== null) {
    const node = nodes.find(n => n.id === dragging);
    node.x = e.clientX - dragOffset.x;
    node.y = e.clientY - dragOffset.y;
    renderNodes();
    renderEdges();
  }
  
  if (connecting !== null) {
    tempEdge = {
      x1: connecting.x,
      y1: connecting.y,
      x2: e.clientX,
      y2: e.clientY
    };
    renderEdges();
  }
}

function handleMouseUp(e) {
  if (connecting !== null) {
    const target = e.target;
    if (target.classList.contains('port') && target.dataset.portType === 'input') {
      const targetNodeId = parseInt(target.dataset.nodeId);
      edges.push({
        from: connecting.nodeId,
        to: targetNodeId
      });
      renderEdges();
    }
  }
  
  dragging = null;
  connecting = null;
  tempEdge = null;
  renderEdges();
}

document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

document.getElementById('addInput').addEventListener('click', () => addNode('input'));
document.getElementById('addProcess').addEventListener('click', () => addNode('process'));

renderNodes();
renderEdges();