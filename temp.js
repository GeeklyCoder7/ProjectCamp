function greet(name, something) {
    console.log("Hello", name)
    something()
    return function returnwalaFun() {
        console.log("returning something")
    }
}

function kuchto() {
    console.log("ye kuch to hai")
}

const result = greet("afwan",  kuchto)
console.log(result())