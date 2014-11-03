({
    appDir: "${basedir}/src/test/resources/optimizer-tests",
    baseUrl: "myapp",
    dir: "${basedir}/target/optimizer/optimized",
    optimize:"none",
    paths:{
        "protocop":"${basedir}/src/main/resources/protocop",
        "types":"${basedir}/src/main/resources/types"  
    },
    modules: [
        {
            name: "main"
        }
    ]
})