console.clear()

class Utils {
  static randomRange(min, max) {
    return Math.random() * (max - min) + min
  }

  static mapRange (value, inputMin, inputMax, outputMin, outputMax, clamp) {
    if (Math.abs(inputMin - inputMax) < Number.EPSILON) {
      return outputMin;
    } else {
      var outVal = ((value - inputMin) / (inputMax - inputMin) * (outputMax - outputMin) + outputMin);
      if (clamp) {
        if (outputMax < outputMin) {
          if (outVal < outputMax) outVal = outputMax;
          else if (outVal > outputMin) outVal = outputMin;
        } else {
          if (outVal > outputMax) outVal = outputMax;
          else if (outVal < outputMin) outVal = outputMin;
        }
      }
      return outVal;
    }
  }
}

Utils.simplex = new SimplexNoise('seed') 

class App {
  constructor() {
    this.config = {
      bgColor: chroma({ h: 10, s: 0.3, l: 0.92}).hex()
    }
    
    this.canvas = document.getElementById('c')
    this.ctx = this.canvas.getContext('2d')
    
    this.shadowCanvas = document.createElement('canvas')
    this.shadowCtx = this.shadowCanvas.getContext('2d')
    
    this.timestamp = 0
    this.fpsHistory = []
    
    this.paused = false
    this.pauseCounter = 100
    
    this.setUpVars()
    this.setUpListeners()
    // this.setUpGui()
    this.update()
  }

  setUpGui() {
    const pane = new Tweakpane()
    const folder = pane.addFolder({
      expanded: false,
      title: 'Settings',
    })
    folder.addInput(this.config, 'bgColor')
  }
  
  setUpVars() {
    this.canvas.width = this.shadowCanvas.width = this.wWidth = window.innerWidth
    this.canvas.height = this.shadowCanvas.height = this.wHeight = window.innerHeight
    this.wCenterX = this.wWidth / 2
    this.wCenterY = this.wHeight / 2
    this.wHypot = Math.hypot(this.wWidth, this.wHeight)
    this.wMin = Math.min(this.wWidth, this.wHeight)
    
    this.particles = this.getParticles(200)
    this.explosionParticles = this.getParticles(20, 0)
  }
  
  getParticles(count, initProgress) {
    const particles = []
    const step = Math.PI / count
    
    for (let angle = step; angle <= Math.PI * 2; angle += step) {
      let progress
      if (initProgress === undefined) {
        progress = angle > Math.PI ? (angle - Math.PI) / Math.PI : 1 - (angle / Math.PI)
      } else {
        progress = initProgress
      }
      
      particles.push({
        angle,
        progress: progress
      })
    }
    
    return particles
  }
  
  setUpListeners() {
    window.addEventListener('resize', this.setUpVars.bind(this))
  }
  
  fillHeart(ctx, radius) {
    ctx.beginPath()
    ctx.moveTo(
      Math.cos(0) * radius, 
      Math.sin(0) * radius
    )
    this.particles.forEach((particle, pid) => {
      const xPos = Math.cos(particle.angle) * (radius * particle.progress)
      const yPos = Math.sin(particle.angle) * (radius * particle.progress)

      ctx.lineTo(xPos, yPos)
    })
    ctx.closePath()

    ctx.fillStyle = '#C44D58'
    ctx.fill()
  }
  
  draw(ctx) {
    ctx.save()
    ctx.clearRect(0, 0, this.wWidth, this.wHeight)
    ctx.restore()
    
    const radius = this.wMin * 0.4
    const size = this.wMin * 0.02
    let shouldPause = false
    
    ctx.save()
    ctx.translate(this.wCenterX, this.wCenterY - (radius / 2))
    ctx.rotate(Math.PI * 0.5)
    
    this.particles.forEach((particle, pid) => {
      const xPos = Math.cos(particle.angle) * (radius * particle.progress)
      const yPos = Math.sin(particle.angle) * (radius * particle.progress)
      const n = Utils.simplex.noise2D(xPos / 150, yPos / 150)
      
      ctx.beginPath()
      ctx.arc(xPos, yPos, size + (size / 1.5 * n), 0, Math.PI * 2)
      ctx.fillStyle = '#C44D58'
      ctx.fill()
      
      if (!this.paused) {
        particle.progress -= 0.005
      } else {
        this.fillHeart(ctx, radius)
      }
      
      if (particle.progress < 0) {
        particle.progress = 1
      }
      
      if (!this.paused && pid === this.particles.length - 1 && particle.progress === 1) {
        // stop the movement and fill the heart
        this.paused = true
        this.pauseCounter = 10
        
        this.fillHeart(ctx, radius)
        this.explosionParticles.forEach(particle => particle.progress = 0)
      }
    })
    
    ctx.restore()
    
    // Explosion
    const expRadius = this.wMin * 0.5
    ctx.save()
    ctx.translate(this.wCenterX, this.wCenterY - (radius * 0.2))
    ctx.rotate(Math.PI * 0.5)
    
    this.explosionParticles.forEach((particle, pid) => {
      if (particle.progress < 1) {
        const xPos = Math.cos(particle.angle) * (expRadius * particle.progress)
        const yPos = Math.sin(particle.angle) * (expRadius * particle.progress)
        
        ctx.beginPath()
        ctx.arc(xPos, yPos, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#C44D58'
        ctx.fill()
        
        particle.progress += 0.04
      }
    })
    ctx.restore()
  }
  
  update(t) {
    const prevTimestamp = this.timestamp * 5000
    
    if (t) {
      if (this.paused) {
        this.pauseCounter--

        if (this.pauseCounter <= 0) {
          this.paused = false
        }
      }

      this.timestamp = t / 5000
      this.draw(this.shadowCtx)
    }
    
    this.ctx.clearRect(0, 0, this.wWidth, this.wHeight)
    this.ctx.drawImage(this.shadowCanvas, 0, 0)
    
    // show fps
    const fps = Math.round(1 / (t - prevTimestamp) * 1000)
    this.fpsHistory.unshift(fps)
    this.fpsHistory.length = 5
    this.ctx.font = '16px sans-serif'
    this.ctx.fillText(this.fpsHistory.reduce((a,b) => a+b) / 5, 50, 50)
    
    window.requestAnimationFrame(this.update.bind(this))
  }
}

new App()