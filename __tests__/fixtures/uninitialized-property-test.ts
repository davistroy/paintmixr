
class User {
  // Strict mode should catch uninitialized property
  name: string
  age: number

  constructor() {
    // name not initialized
    this.age = 25
  }
}
