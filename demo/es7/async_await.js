const createPromise = (value) => {
	    return new Promise((resolve, reject) => {
	    	setTimeout(()=>{
	    		resolve(value);
	    	}, 1000);
	    });
	};

	console.log("=====1");

(()=>{
	console.log("+A");
	createPromise('A').then(result=>{
		console.log("+B");
		return createPromise(result + 'B');
	}).then(result=>{
		console.log("+C");
		return createPromise(result + 'C');
	}).then(result=>{
		console.log("=" + result);
	});	
})();

console.log("=====2");

(async ()=>{
	console.log("#1");
    let result1 = await createPromise("1");
   	console.log("#2");
    let result2 = await createPromise("2");
	console.log("#3");
    let result3 = await createPromise("3");
	console.log("#=" + result3);
})();

console.log("=====3");