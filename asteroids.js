var canvas
var canvasContext

var gameState = 1

var updateIntervalPerSecond = 30

var shipX = 300
var shipY = 300
var shipXVel = 0
var shipYVel = 0
var shipMaxVel = 10
var acceleration = 0

var shipVecX = 1
var shipVecY = 1
var shipMag = 1

var mouseVecX = 1
var mouseVecY = 1
var mouseMag = 1

var shipSize = 10
var shipFrontX = 0
var shipFrontY = 0

var entities = []
// var decayTime = 300 // meant for ship bullets, but also so we dont have overflowing entities

var biggestAsteriod = 100
var smallestAsteroid = 13
var asteroidMaxSides = 10
var asteroidMaxRoughness = 0.7
var asteroidMinVel = 0.5
// var asteroidMaxVel = 3

window.onload = function () {
  canvas = document.getElementById('AsteroidsCanvas')
  canvas.focus()
  canvasContext = canvas.getContext('2d')
  canvasContext.imageSmoothingEnabled = false

  setInterval(checkState, 1000 / updateIntervalPerSecond)

  // setup mouse events
  canvas.addEventListener('mousemove', function (e) {
    mouseVecX = e.clientX - shipX
    mouseVecY = e.clientY - shipY
    mouseMag = getMagnitude(mouseVecX, mouseVecY)
  })
  canvas.addEventListener('mousedown', function () {
    shipVecX = mouseVecX / mouseMag
    shipVecY = mouseVecY / mouseMag

    acceleration = 0.5
  })
  canvas.addEventListener('mouseup', function () {
    acceleration = 0
  })
  canvas.addEventListener('keydown', function (e) {
    if (e.key === ' ') {
      entities.push(new Bullet())
    }
  })

  // set default outine
  canvasContext.strokeStyle = 'white'

  // fill the scene with asteroids
  createAsteroids(6)
}

// reset ship
// function reset () {}

// simplified matrix rotation for 2D, always around the origin
function rotate (theta, xIn, yIn) {
  var r00 = Math.cos(theta)
  var r01 = -Math.sin(theta)
  var r10 = Math.sin(theta)
  var r11 = Math.cos(theta)

  var point = []

  point[0] = r00 * xIn + r01 * yIn
  point[1] = r10 * xIn + r11 * yIn

  return point
}

function getMagnitude (x, y) {
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
}

function getRandomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

function getRandomIntInnerBound (min, max, innerMin, innerMax) {
  innerMin = Math.ceil(innerMin)
  innerMax = Math.floor(innerMax)
  var pos = getRandomInt(min, max)
  while (pos > innerMin && pos < innerMax) {
    pos = getRandomInt(min, max)
  }
  return pos
}

function checkState () {
  canvasContext.fillStyle = 'black'
  canvasContext.fillRect(0, 0, canvas.width, canvas.height)
  if (gameState === 1) {
    update()
  } else {
    canvasContext.fillStyle = 'white'
    canvasContext.fillText('G A M E O V E R', canvas.width / 2, canvas.height / 2, canvas.width / 4)
  }
}

function update () {
  shipMag = getMagnitude(shipVecX, shipVecY)

  var shipXVelNew = shipVecX / shipMag * acceleration
  var shipYVelNew = shipVecY / shipMag * acceleration

  var shipAbsoluteVel = getMagnitude(shipXVelNew + shipXVel, shipYVelNew + shipYVel)
  // these will be 0 if velocity is not increasing, > 0 if
  var shipXVelDiff = Math.abs(shipXVel + shipXVelNew) - Math.abs(shipXVel)
  var shipYVelDiff = Math.abs(shipYVel + shipYVelNew) - Math.abs(shipYVel)
  if (shipAbsoluteVel < shipMaxVel || (shipXVelDiff <= 0 && shipYVelDiff <= 0)) {
    shipXVel += shipXVelNew
    shipYVel += shipYVelNew
  }

  shipX += shipXVel
  shipY += shipYVel

  if (shipX < 0) {
    shipX = canvas.width
  }
  if (shipX > canvas.width) {
    shipX = 0
  }
  if (shipY < 0) {
    shipY = canvas.height
  }
  if (shipY > canvas.height) {
    shipY = 0
  }

  // wipe the canvas
  canvasContext.fillStyle = 'black'
  canvasContext.fillRect(0, 0, canvas.width, canvas.height)

  // re draw the ship
  var x = mouseVecX / mouseMag
  var y = mouseVecY / mouseMag

  var theta = Math.atan(y / x)

  // basically if theta > 90 deg OR theta < -90 deg , then we can simply find our angle relative to (-1,0) or theta = PI
  if (x <= 0) {
    theta = Math.PI + theta
  }

  var p0 = rotate(theta, shipSize * 1, shipSize * 0)
  shipFrontX = shipX + p0[0]
  shipFrontY = shipY + p0[1]
  var p1 = rotate(theta, shipSize * -1 / 2, shipSize * Math.sqrt(3) / 2)
  var p2 = rotate(theta, shipSize * -1 / 2, shipSize * -Math.sqrt(3) / 2)

  // draw ship
  canvasContext.beginPath()
  canvasContext.moveTo(shipX + p0[0], shipY + p0[1])
  canvasContext.lineTo(shipX + p1[0], shipY + p1[1])
  canvasContext.lineTo(shipX + p2[0], shipY + p2[1])
  canvasContext.lineTo(shipX + p0[0], shipY + p0[1])
  canvasContext.stroke()

  // draw entities
  for (var e of entities) {
    if (e instanceof Bullet) {
      doCollision(e)
    } else if (e instanceof Asteroid) {
      checkShipCollision(e)
    }
    e.draw()
  }

  // direcional debug
  // p3 = rotate(theta, 1*shipSize, 0*shipSize)
  // canvasContext.beginPath();
  // canvasContext.moveTo(shipX, shipY);
  // canvasContext.lineTo(shipX + p3[0], shipY + p3[1]);
  // canvasContext.strokeStyle = 'white';
  // canvasContext.stroke();
  // canvasContext.fillRect(shipX + p3[0], shipY + p3[1], 10, 10);

  // debug info
  // canvasContext.fillStyle = 'white'
  // canvasContext.fillText('(x= ' + shipX + ', y= ' + shipY + ')', 0, 10)
}

function doCollision (bullet) {
  for (var e of entities) {
    if (e instanceof Asteroid) {
      var xdist = e.x - bullet.x
      var ydist = e.y - bullet.y
      var dist = Math.sqrt(Math.pow(xdist, 2) + Math.pow(ydist, 2))
      // console.log(xdist + ' ' + ydist + ' ' + dist)
      if (dist <= e.radius) {
        // remove asteroid and split
        var asteroidIndex = entities.indexOf(e)
        if (e.radius > smallestAsteroid) {
          splitAsteroid(asteroidIndex, bullet)
        } else {
          entities.splice(asteroidIndex, 1)
        }

        // remove bullet
        var bulletIndex = entities.indexOf(bullet)
        entities.splice(bulletIndex, 1)
        break
      }
    }
  }
}

function checkShipCollision (entity) {
  var dist = getMagnitude(shipX - entity.x, shipY - entity.y)
  console.log(dist, entity.radius, entity.maxRadius)
  if (dist < entity.maxRadius - 5) {
    gameState = 2 // game over
  }
}

function splitAsteroid (currentAsteroidIndex, bullet) {
  var asteroid = entities[currentAsteroidIndex]
  var newRadi = asteroid.maxRadius / 2
  var newX = asteroid.x
  var newY = asteroid.y

  var minAddVel = 0.1
  var maxAddVel = 0.5

  var newXVel1 = asteroid.xVel + bullet.xVel * Math.random() * (maxAddVel - minAddVel) + minAddVel
  var newYVel1 = asteroid.yVel + bullet.yVel * Math.random() * (maxAddVel - minAddVel) + minAddVel

  var newXVel2 = asteroid.xVel + bullet.xVel * Math.random() * (maxAddVel - minAddVel) + minAddVel
  var newYVel2 = asteroid.yVel + bullet.yVel * Math.random() * (maxAddVel - minAddVel) + minAddVel

  var split1 = new Asteroid(newRadi, newX + newRadi / 2, newY + newRadi / 2, newXVel1, newYVel1)
  var split2 = new Asteroid(newRadi, newX - newRadi / 2, newY - newRadi / 2, newXVel2, newYVel2)

  split1.createShape(asteroidMaxSides)
  split2.createShape(asteroidMaxSides)

  entities.splice(currentAsteroidIndex, 1)
  entities.push(split1)
  entities.push(split2)
}

function createAsteroids (n) {
  for (var i = 0; i < n; i++) {
    var innerRadius = 10 + biggestAsteriod
    var padding = 10
    var xPos = getRandomIntInnerBound(padding, canvas.width - padding, canvas.width / 2 - innerRadius, canvas.width / 2 + innerRadius)
    var yPos = getRandomIntInnerBound(padding, canvas.height - padding, canvas.height / 2 - innerRadius, canvas.height / 2 + innerRadius)
    var xVel = getRandomIntInnerBound(-1.5, 1.5, -1, 1) * asteroidMinVel
    var yVel = getRandomIntInnerBound(-1.5, 1.5, -1, 1) * asteroidMinVel

    var asteroid = new Asteroid(biggestAsteriod, xPos, yPos, xVel, yVel)
    asteroid.createShape(asteroidMaxSides)
    entities.push(asteroid)
  }
}

function Asteroid (radius, x0, y0, xVel, yVel) {
  this.radius = radius
  this.x = x0
  this.y = y0
  this.xVel = xVel
  this.yVel = yVel
  this.time = 0
  this.shape
  this.lastPoint
  this.maxRadius = 0

  this.draw = function () {
    // this.time++;
    this.x += this.xVel
    this.y += this.yVel

    if (this.x < 0) {
      this.x = canvas.width
    }
    if (this.x > canvas.width) {
      this.x = 0
    }
    if (this.y < 0) {
      this.y = canvas.height
    }
    if (this.y > canvas.height) {
      this.y = 0
    }

    if (this.shape != null) {
      canvasContext.beginPath()

      canvasContext.moveTo(this.x + this.lastPoint[0], this.y + this.lastPoint[1])
      for (var point of this.shape) {
        canvasContext.lineTo(this.x + point[0], this.y + point[1])
        canvasContext.moveTo(this.x + point[0], this.y + point[1])
      }
      canvasContext.stroke()
    }
  }

  this.createShape = function (sides) {
    var polygonPoints = []
    for (var i = 0; i < sides; i++) {
      var theta = 2 * Math.PI * i / sides
      var randomLength = this.radius * (Math.random() * (1 - asteroidMaxRoughness) + asteroidMaxRoughness)
      var xi = randomLength * Math.cos(theta)
      var yi = randomLength * Math.sin(theta)
      polygonPoints.push([xi, yi])
      if (this.maxRadius < randomLength) {
        this.maxRadius = randomLength
      }
    }
    this.shape = polygonPoints
    this.lastPoint = this.shape[this.shape.length - 1]
  }

  this.getTime = function () {
    return this.time
  }
};

function Bullet () {
  this.x = shipFrontX
  this.y = shipFrontY
  this.xVel = mouseVecX / mouseMag * (3)
  this.yVel = mouseVecY / mouseMag * (3)
  this.time = 0

  this.draw = function () {
    // this.time++;
    this.x += this.xVel
    this.y += this.yVel

    if (this.x < 0) {
      this.x = canvas.width
    }
    if (this.x > canvas.width) {
      this.x = 0
    }
    if (this.y < 0) {
      this.y = canvas.height
    }
    if (this.y > canvas.height) {
      this.y = 0
    }

    canvasContext.fillStyle = 'white'
    canvasContext.fillRect(this.x, this.y, 3, 3)
  }

  this.getTime = function () {
    return this.time
  }
}
