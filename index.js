/* GLOBAL CONSTANTS AND VARIABLES */

import { createPlane, createPlanePart6 } from "./input-utils.js";

/* assignment specific globals */
var defaultEye = vec3.fromValues(0.0, -1.4, -0.4); // default eye position in world space
var defaultCenter = vec3.fromValues(0.0, 0.0, 0.6); // default view direction in world space
var defaultUp = vec3.fromValues(0, 1, 0); // default view up vector
var lightAmbient = vec3.fromValues(1, 1, 1); // default light ambient emission
var lightDiffuse = vec3.fromValues(1, 1, 1); // default light diffuse emission
var lightSpecular = vec3.fromValues(1, 1, 1); // default light specular emission
var lightPosition = vec3.fromValues(0.0, 1.2, -0.5); // default light position
var rotateTheta = Math.PI / 50; // how much to rotate models by with each key press

/* webgl and geometry data */
var gl = null; // the all powerful gl object. It's all here folks!
var inputTriangles = []; // the triangle data as loaded from input files
var numTriangleSets = 0; // how many triangle sets in input scene
var vertexBuffers = []; // this contains vertex coordinate lists by set, in triples
var normalBuffers = []; // this contains normal component lists by set, in triples
var triSetSizes = []; // this contains the size of each triangle set
var triangleBuffers = []; // lists of indices into vertexBuffers by set, in triples
var viewDelta = 0; // how much to displace view with each key press

/* shader parameter locations */
var vPosAttribLoc; // where to put position for vertex shader
var vNormAttribLoc;
var mMatrixULoc; // where to put model matrix for vertex shader
var pvmMatrixULoc; // where to put project model view matrix for vertex shader
var ambientULoc; // where to put ambient reflecivity for fragment shader
var diffuseULoc; // where to put diffuse reflecivity for fragment shader
var specularULoc; // where to put specular reflecivity for fragment shader
var shininessULoc; // where to put specular exponent for fragment shader

/* interaction variables */
var Eye = vec3.clone(defaultEye); // eye position in world space
var Center = vec3.clone(defaultCenter); // view direction in world space
var Up = vec3.clone(defaultUp); // view up vector in world space

const isMakeItYourOwn = localStorage.getItem('hs-project') || "no";

// GAME STATES
let whichLog = -1;
let onLog = false;
let inWater = false;
let inEnd = false;

let lives = 5;
let currScore = 0;
let highScore = 0;

let homes = [false, false, false, false, false];
let countRaise = [0, 0, 0, 0, 0];

function updateScore() {
    currScore += 100;
    let scoreBoard = document.getElementById("curr-score");
    scoreBoard.textContent = currScore
}

function death() {
    currScore = 0;
    for (let i = 0; i < homes.length; ++i) {
        if (homes[i]) {
            currScore += 100;
        }
    }
    lives -= 1;
    if (lives == 0) {
        alert("Game over!");
        endGame();
        return;
    }
    let scoreBoard = document.getElementById("curr-score");
    scoreBoard.textContent = currScore;
    let liveBoard = document.getElementById("lives");
    liveBoard.textContent = lives;
}

function endGame() {
    for (let i = 0; i < homes.length; ++i) {
        countRaise[i] = 0;
        if (homes[i]) {
            homes[i] = false;
            let N = inputTriangles.length;
            let index = N - 5 + i;
            inputTriangles[index].translation = vec3.create()
        }
    }
    lives = 5;
    let highScoreBoard = document.getElementById("high-score");
    if (currScore >= highScore) {
        highScore = currScore;
    }
    currScore = 0;
    let scoreBoard = document.getElementById("curr-score");
    scoreBoard.textContent = currScore
    highScoreBoard.textContent = highScore;
    let liveBoard = document.getElementById("lives");
    liveBoard.textContent = lives;
    inputTriangles[12].translation = vec3.create()
}

// Key actions
function movementLogic(event) {
    const translateOffsetY = 0.2
    const translateOffsetX = 0.1
    function translateModel(offset) {
        vec3.add(
            inputTriangles[12].translation,
            inputTriangles[12].translation,
            offset
        );
    } // end translate model
    switch (event.code) {
        case "ArrowUp":
            translateModel(vec3.fromValues(0.0, translateOffsetY, 0.0))
            const location = (inputTriangles[12].translation[1] + inputTriangles[12].center[1]).toFixed(2)
            if (location == 0.3) {
                translateModel(vec3.fromValues(0.0, 0.0, -0.05))
            } else if (location == 1.1) {
                translateModel(vec3.fromValues(0.0, 0.0, 0.05))
            }
            break;
        case "ArrowDown":
            translateModel(vec3.fromValues(0.0, -translateOffsetY, 0.0))
            const location1 = (inputTriangles[12].translation[1] + inputTriangles[12].center[1]).toFixed(2)
            if (location1 == 0.1) {
                translateModel(vec3.fromValues(0.0, 0.0, 0.05))
            } else if (location1 == 0.9) {
                translateModel(vec3.fromValues(0.0, 0.0, -0.05))
            }
            break;
        case "ArrowRight":
            if (inputTriangles[12].translation[0] + inputTriangles[12].center[0] <= -0.9)
                return
            translateModel(vec3.fromValues(-translateOffsetX, 0.0, 0.0))
            break;
        case "ArrowLeft":
            if (inputTriangles[12].translation[0] + inputTriangles[12].center[0] >= 0.9)
                return
            translateModel(vec3.fromValues(translateOffsetX, 0.0, 0.0))
            break;
        case "Digit1":
            if (isMakeItYourOwn === "no") {
                localStorage.setItem('hs-project', 'yes');
            } else {
                localStorage.setItem('hs-project', 'no');
            }
            window.location.reload()
            break;

    }
}

// set up the webGL environment
function setupWebGL() {

    // Set up keys
    document.onkeydown = movementLogic; // call this when key pressed

    if (isMakeItYourOwn === "yes") {
        var imageCanvas = document.getElementById("myImageCanvas"); // create a 2d canvas
        var cw = imageCanvas.width, ch = imageCanvas.height;
        var imageContext = imageCanvas.getContext("2d");
        var bkgdImage = new Image();
        bkgdImage.crossOrigin = "Anonymous";
        bkgdImage.src = "christmas_tree.png";
        bkgdImage.onload = function () {
            var iw = bkgdImage.width, ih = bkgdImage.height;
            imageContext.drawImage(bkgdImage, 0, 0, iw, ih, 0, 0, cw, ch);
        }
    }


    // Get the canvas and context
    var canvas = document.getElementById("canvas"); // create a js canvas

    gl = canvas.getContext("webgl"); // get a webgl object from it

    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            // gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try

    catch (e) {
        console.error(e);
    } // end catch

} // end setupWebGL

// read models in, load them into webgl buffers
function loadModels() {

    if (isMakeItYourOwn === "yes") {
        inputTriangles = createPlanePart6();
    } else {
        inputTriangles = createPlane();
    }

    try {
        if (inputTriangles == String.null)
            throw "Unable to load triangles file!";
        else {
            var whichSetVert; // index of vertex in current triangle set
            var whichSetTri; // index of triangle in current triangle set
            var vtxToAdd; // vtx coords to add to the coord array
            var normToAdd; // vtx normal to add to the coord array
            var triToAdd; // tri indices to add to the index array
            var maxCorner = vec3.fromValues(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE); // bbox corner
            var minCorner = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE); // other corner

            // process each triangle set to load webgl vertex and triangle buffers
            numTriangleSets = inputTriangles.length; // remember how many tri sets
            for (var whichSet = 0; whichSet < numTriangleSets; whichSet++) { // for each tri set

                // set up hilighting, modeling translation and rotation
                inputTriangles[whichSet].center = vec3.fromValues(0, 0, 0);  // center point of tri set
                inputTriangles[whichSet].on = false; // not highlighted
                inputTriangles[whichSet].translation = vec3.fromValues(0, 0, 0); // no translation
                inputTriangles[whichSet].xAxis = vec3.fromValues(1, 0, 0); // model X axis
                inputTriangles[whichSet].yAxis = vec3.fromValues(0, 1, 0); // model Y axis 

                // set up the vertex and normal arrays, define model center and axes
                inputTriangles[whichSet].glVertices = []; // flat coord list for webgl
                inputTriangles[whichSet].glNormals = []; // flat normal list for webgl
                var numVerts = inputTriangles[whichSet].vertices.length; // num vertices in tri set
                for (whichSetVert = 0; whichSetVert < numVerts; whichSetVert++) { // verts in set
                    vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert]; // get vertex to add
                    normToAdd = inputTriangles[whichSet].normals[whichSetVert]; // get normal to add
                    inputTriangles[whichSet].glVertices.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]); // put coords in set coord list
                    inputTriangles[whichSet].glNormals.push(normToAdd[0], normToAdd[1], normToAdd[2]); // put normal in set coord list
                    vec3.max(maxCorner, maxCorner, vtxToAdd); // update world bounding box corner maxima
                    vec3.min(minCorner, minCorner, vtxToAdd); // update world bounding box corner minima
                    vec3.add(inputTriangles[whichSet].center, inputTriangles[whichSet].center, vtxToAdd); // add to ctr sum
                } // end for vertices in set
                vec3.scale(inputTriangles[whichSet].center, inputTriangles[whichSet].center, 1 / numVerts); // avg ctr sum

                // send the vertex coords and normals to webGL
                vertexBuffers[whichSet] = gl.createBuffer(); // init empty webgl set vertex coord buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].glVertices), gl.STATIC_DRAW); // data in
                normalBuffers[whichSet] = gl.createBuffer(); // init empty webgl set normal component buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].glNormals), gl.STATIC_DRAW); // data in

                // set up the triangle index array, adjusting indices across sets
                inputTriangles[whichSet].glTriangles = []; // flat index list for webgl
                triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length; // number of tris in this set
                for (whichSetTri = 0; whichSetTri < triSetSizes[whichSet]; whichSetTri++) {
                    triToAdd = inputTriangles[whichSet].triangles[whichSetTri]; // get tri to add
                    inputTriangles[whichSet].glTriangles.push(triToAdd[0], triToAdd[1], triToAdd[2]); // put indices in set list
                } // end for triangles in set

                // send the triangle indices to webGL
                triangleBuffers.push(gl.createBuffer()); // init empty triangle index buffer
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]); // activate that buffer
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(inputTriangles[whichSet].glTriangles), gl.STATIC_DRAW); // data in

            } // end for each triangle set 

        } // end if triangle file loaded
    } // end try 

    catch (e) {
        console.error(e);
    } // end catch
} // end load models

// setup the webGL shaders
function setupShaders() {

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 aVertexPosition; // vertex position
        attribute vec3 aVertexNormal; // vertex normal
        
        uniform mat4 umMatrix; // the model matrix
        uniform mat4 upvmMatrix; // the project view model matrix
        
        varying vec3 vWorldPos; // interpolated world position of vertex
        varying vec3 vVertexNormal; // interpolated normal for frag shader

        void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
        }
    `;

    // define fragment shader in essl using es6 template strings
    var fShaderCode = `
        precision mediump float; // set float to medium precision

        // eye location
        uniform vec3 uEyePosition; // the eye's position in world
        
        // light properties
        uniform vec3 uLightAmbient; // the light's ambient color
        uniform vec3 uLightDiffuse; // the light's diffuse color
        uniform vec3 uLightSpecular; // the light's specular color
        uniform vec3 uLightPosition; // the light's position
        
        // material properties
        uniform vec3 uAmbient; // the ambient reflectivity
        uniform vec3 uDiffuse; // the diffuse reflectivity
        uniform vec3 uSpecular; // the specular reflectivity
        uniform float uShininess; // the specular exponent
        
        // geometry properties
        varying vec3 vWorldPos; // world xyz of fragment
        varying vec3 vVertexNormal; // normal of fragment
            
        void main(void) {
        
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            // combine to output color
            vec3 colorOut = ambient + diffuse + specular; // no specular yet
            gl_FragColor = vec4(colorOut, 1.0); 
        }
    `;

    try {
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution

        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            gl.deleteShader(fShader);
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            gl.deleteShader(vShader);
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)

                // locate and enable vertex attributes
                vPosAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
                gl.enableVertexAttribArray(vPosAttribLoc); // connect attrib to array
                vNormAttribLoc = gl.getAttribLocation(shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
                gl.enableVertexAttribArray(vNormAttribLoc); // connect attrib to array

                // locate vertex uniforms
                mMatrixULoc = gl.getUniformLocation(shaderProgram, "umMatrix"); // ptr to mmat
                pvmMatrixULoc = gl.getUniformLocation(shaderProgram, "upvmMatrix"); // ptr to pvmmat

                // locate fragment uniforms
                var eyePositionULoc = gl.getUniformLocation(shaderProgram, "uEyePosition"); // ptr to eye position
                var lightAmbientULoc = gl.getUniformLocation(shaderProgram, "uLightAmbient"); // ptr to light ambient
                var lightDiffuseULoc = gl.getUniformLocation(shaderProgram, "uLightDiffuse"); // ptr to light diffuse
                var lightSpecularULoc = gl.getUniformLocation(shaderProgram, "uLightSpecular"); // ptr to light specular
                var lightPositionULoc = gl.getUniformLocation(shaderProgram, "uLightPosition"); // ptr to light position
                ambientULoc = gl.getUniformLocation(shaderProgram, "uAmbient"); // ptr to ambient
                diffuseULoc = gl.getUniformLocation(shaderProgram, "uDiffuse"); // ptr to diffuse
                specularULoc = gl.getUniformLocation(shaderProgram, "uSpecular"); // ptr to specular
                shininessULoc = gl.getUniformLocation(shaderProgram, "uShininess"); // ptr to shininess

                // pass global constants into fragment uniforms
                gl.uniform3fv(eyePositionULoc, Eye); // pass in the eye's position
                gl.uniform3fv(lightAmbientULoc, lightAmbient); // pass in the light's ambient emission
                gl.uniform3fv(lightDiffuseULoc, lightDiffuse); // pass in the light's diffuse emission
                gl.uniform3fv(lightSpecularULoc, lightSpecular); // pass in the light's specular emission
                gl.uniform3fv(lightPositionULoc, lightPosition); // pass in the light's position
            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 

    catch (e) {
        console.error(e);
    } // end catch
} // end setup shaders

// render the loaded model
function renderModels() {

    // construct the model transform matrix, based on model state
    function makeModelTransform(currModel) {
        var zAxis = vec3.create(), sumRotation = mat4.create(), temp = mat4.create(), negCtr = vec3.create();

        // move the model to the origin
        mat4.fromTranslation(mMatrix, vec3.negate(negCtr, currModel.center));

        // scale for highlighting if needed
        if (currModel.on)
            mat4.multiply(mMatrix, mat4.fromScaling(temp, vec3.fromValues(1.2, 1.2, 1.2)), mMatrix); // S(1.2) * T(-ctr)

        // rotate the model to current interactive orientation
        vec3.normalize(zAxis, vec3.cross(zAxis, currModel.xAxis, currModel.yAxis)); // get the new model z axis
        mat4.set(sumRotation, // get the composite rotation
            currModel.xAxis[0], currModel.yAxis[0], zAxis[0], 0,
            currModel.xAxis[1], currModel.yAxis[1], zAxis[1], 0,
            currModel.xAxis[2], currModel.yAxis[2], zAxis[2], 0,
            0, 0, 0, 1);
        mat4.multiply(mMatrix, sumRotation, mMatrix); // R(ax) * S(1.2) * T(-ctr)

        // translate back to model center
        mat4.multiply(mMatrix, mat4.fromTranslation(temp, currModel.center), mMatrix); // T(ctr) * R(ax) * S(1.2) * T(-ctr)

        // translate model to current interactive orientation
        mat4.multiply(mMatrix, mat4.fromTranslation(temp, currModel.translation), mMatrix); // T(pos)*T(ctr)*R(ax)*S(1.2)*T(-ctr)

    } // end make model transform

    // var hMatrix = mat4.create(); // handedness matrix
    var pMatrix = mat4.create(); // projection matrix
    var vMatrix = mat4.create(); // view matrix
    var mMatrix = mat4.create(); // model matrix
    var pvMatrix = mat4.create(); // hand * proj * view matrices
    var pvmMatrix = mat4.create(); // hand * proj * view * model matrices

    window.requestAnimationFrame(renderModels); // set up frame render callback

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers

    // set up projection and view
    // mat4.fromScaling(hMatrix,vec3.fromValues(-1,1,1)); // create handedness matrix
    mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
    mat4.lookAt(vMatrix, Eye, Center, Up); // create view matrix
    mat4.multiply(pvMatrix, pvMatrix, pMatrix); // projection
    mat4.multiply(pvMatrix, pvMatrix, vMatrix); // projection * view

    // render each triangle set
    var currSet; // the tri set and its material properties
    for (var whichTriSet = 0; whichTriSet < numTriangleSets; whichTriSet++) {
        currSet = inputTriangles[whichTriSet];

        if (currSet.model && currSet.model === "frog") {
            for (let i = 13; i < inputTriangles.length; ++i) {
                let frogCenter = [
                    inputTriangles[12].translation[0] + inputTriangles[12].center[0],
                    inputTriangles[12].translation[1] + inputTriangles[12].center[1],
                    inputTriangles[12].translation[2] + inputTriangles[12].center[2],
                ]
                let objectCenter = [
                    inputTriangles[i].translation[0] + inputTriangles[i].center[0],
                    inputTriangles[i].translation[1] + inputTriangles[i].center[1],
                    inputTriangles[i].translation[2] + inputTriangles[i].center[2],
                ]

                let frogBoundings = [
                    frogCenter[0] + (inputTriangles[12].width / 2),
                    frogCenter[0] - (inputTriangles[12].width / 2),
                ]

                let objectBoundings = [
                    objectCenter[0] + (inputTriangles[i].width / 2),
                    objectCenter[0] - (inputTriangles[i].width / 2),
                ]

                if (frogCenter[1] >= 1.1) {
                    inWater = false;
                    inEnd = true;
                    whichLog = -1;
                    onLog = false
                } else if (frogCenter[1] >= 0.1) {
                    inWater = true;
                    inEnd = false;
                    if (
                        (
                            ((frogBoundings[0] > objectBoundings[0] && frogBoundings[0] > objectBoundings[1]) && (frogBoundings[1] > objectBoundings[0] && frogBoundings[1] > objectBoundings[1])) ||
                            ((frogBoundings[0] < objectBoundings[0] && frogBoundings[0] < objectBoundings[1]) && (frogBoundings[1] < objectBoundings[0] && frogBoundings[1] < objectBoundings[1]))
                        ) && (objectCenter[1].toFixed(2) === frogCenter[1].toFixed(2))) {
                        whichLog = -1;
                        onLog = false;
                    } else {
                        if (objectCenter[1].toFixed(2) === frogCenter[1].toFixed(2)) {
                            whichLog = i;
                            onLog = true;
                            break;
                        }
                    }
                } else {
                    inWater = false;
                    inEnd = false;
                    onLog = false;
                    whichLog = -1;
                    if (
                        (
                            (objectBoundings[1] > frogBoundings[1] && objectBoundings[1] < frogBoundings[0]) ||
                            (objectBoundings[0] > frogBoundings[1] && objectBoundings[0] < frogBoundings[0])
                        )
                        && objectCenter[1].toFixed(2) === frogCenter[1].toFixed(2)) {
                        inputTriangles[12].translation = vec3.create()
                        death();
                        break;
                    }
                }
            }
        }

        if (currSet.model && currSet.model == "frog") {
            if (inWater) {
                if (onLog) {
                    let log = inputTriangles[whichLog];
                    let delta = log.speed;
                    if (log.direction == "left") {
                        vec3.add(inputTriangles[12].translation, inputTriangles[12].translation, vec3.fromValues(delta, 0.0, 0.0))
                    } else {
                        vec3.add(inputTriangles[12].translation, inputTriangles[12].translation, vec3.fromValues(-delta, 0.0, 0.0))
                    }
                } else {
                    inputTriangles[12].translation = vec3.create()
                    death();
                }
            } else {
                let currPositionX = (inputTriangles[12].translation[0] + inputTriangles[12].center[0]).toFixed(2);
                let currPositionY = (inputTriangles[12].translation[1] + inputTriangles[12].center[1]).toFixed(2);
                currPositionX = parseFloat(currPositionX);
                currPositionY = parseFloat(currPositionY);

                if (currPositionY === 1.1) {
                    if (currPositionX <= 0.87 && currPositionX >= 0.82) {
                        if (homes[0]) {
                            death();
                        } else {
                            homes[0] = true;
                            updateScore();
                        }
                        inputTriangles[12].translation = vec3.create();
                    } else if (currPositionX <= 0.47 && currPositionX >= 0.42) {
                        if (homes[1]) {
                            death();
                        } else {
                            homes[1] = true;
                            updateScore();
                        }
                        inputTriangles[12].translation = vec3.create();
                    } else if (currPositionX <= 0.06 && currPositionX >= 0.01) {
                        if (homes[2]) {
                            death();
                        } else {
                            homes[2] = true;
                            updateScore();
                        }
                        inputTriangles[12].translation = vec3.create();
                    } else if (currPositionX <= -0.34 && currPositionX >= -0.39) {
                        if (homes[3]) {
                            death();
                        } else {
                            homes[3] = true;
                            updateScore();
                        }
                        inputTriangles[12].translation = vec3.create();
                    } else if (currPositionX <= -0.74 && currPositionX >= -0.79) {
                        if (homes[4]) {
                            death();
                        } else {
                            homes[4] = true;
                            updateScore();
                        }
                        inputTriangles[12].translation = vec3.create();
                    } else {
                        inputTriangles[12].translation = vec3.create();
                        death();
                    }
                }
            }
        }

        if (currSet.model && currSet.model == "car") {
            let delta = currSet.speed;
            if (currSet.direction == "left") {
                if (currSet.translation[0] + currSet.center[0] >= 0.9) {
                    currSet.translation = vec3.create()
                } else {
                    vec3.add(currSet.translation, currSet.translation, vec3.fromValues(delta, 0.0, 0.0))
                }
            } else {
                if (currSet.translation[0] + currSet.center[0] <= -0.9) {
                    currSet.translation = vec3.create()
                } else {
                    vec3.add(currSet.translation, currSet.translation, vec3.fromValues(-delta, 0.0, 0.0))
                }
            }
        }

        if (currSet.model && currSet.model == "log") {
            let delta = currSet.speed;
            if (currSet.direction == "left") {
                if (currSet.translation[0] + currSet.center[0] >= 0.9) {
                    currSet.translation = vec3.create()
                } else {
                    vec3.add(currSet.translation, currSet.translation, vec3.fromValues(delta, 0.0, 0.0))
                }
            } else {
                if (currSet.translation[0] + currSet.center[0] <= -0.9) {
                    currSet.translation = vec3.create()
                } else {
                    vec3.add(currSet.translation, currSet.translation, vec3.fromValues(-delta, 0.0, 0.0))
                }
            }
        }

        let flag = 0;
        for (let i = 0; i < homes.length; ++i) {
            if (homes[i]) {
                let N = inputTriangles.length;
                let index = N - 5 + i;
                if (countRaise[i] === 0) {
                    vec3.add(
                        inputTriangles[index].translation,
                        inputTriangles[index].translation,
                        vec3.fromValues(0.0, 0.0, -0.3)
                    )
                    countRaise[i] += 1
                }
                flag += 1
            }
        }

        if (flag === 5) {
            endGame();
            alert("You won!!");
        }

        // make model transform, add to view project
        makeModelTransform(currSet);
        mat4.multiply(pvmMatrix, pvMatrix, mMatrix); // project * view * model
        gl.uniformMatrix4fv(mMatrixULoc, false, mMatrix); // pass in the m matrix
        gl.uniformMatrix4fv(pvmMatrixULoc, false, pvmMatrix); // pass in the hpvm matrix

        // reflectivity: feed to the fragment shader
        gl.uniform3fv(ambientULoc, currSet.material.ambient); // pass in the ambient reflectivity
        gl.uniform3fv(diffuseULoc, currSet.material.diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(specularULoc, currSet.material.specular); // pass in the specular reflectivity
        gl.uniform1f(shininessULoc, currSet.material.n); // pass in the specular exponent

        // vertex buffer: activate and feed into vertex shader
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffers[whichTriSet]); // activate
        gl.vertexAttribPointer(vNormAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed

        // triangle buffer: activate and render
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichTriSet]); // activate
        gl.drawElements(gl.TRIANGLES, 3 * triSetSizes[whichTriSet], gl.UNSIGNED_SHORT, 0); // render

    } // end for each triangle set
} // end render model


/* MAIN -- HERE is where execution begins after window load */

function main() {

    setupWebGL(); // set up the webGL environment
    loadModels(); // load in the models from tri file
    setupShaders(); // setup the webGL shaders
    renderModels(); // draw the triangles using webGL

} // end main

main()