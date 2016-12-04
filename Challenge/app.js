var challenge;

challengeNumber = window.location.href[window.location.href.length-1];

$.getJSON('challenges.json').then(function(data) {
	data.forEach(function(challenge, i) {
		var node = $(".templates .challenge-link").clone();	

		node.attr("data-id", i+1);

		node.find(".challenge-number").text(i+1);
		node.find(".challenge-name").text(challenge.name);
		node.find(".challenge-points").text(challenge.points);

		$("nav").append(node);
	})
});

function reset(challengeNumber) {
	switch (challengeNumber) {
		case "1":
		case "2":
		case "3":
			challengeNumber = +challengeNumber;
			break;
		default:
			challengeNumber = 1
	}

	$(document).on("click", ".challenge-link", function () {
		val = $(this).attr("data-id");
		if (+val === challengeNumber) {
			return;
		}
		
		queryString.push("challenge", val);
		
		reset(val);
	});

	$.getJSON('challenge' + challengeNumber + '.json').then(function(data) {
		challenge = data;

		var s = localStorage.getItem(challenge.functionName) || "function " + challenge.functionName + "(" + challenge.inputs.map(a=>a.param).join`,`+ ") { \n\t\n}"
		
		$("#inputs").empty();
		$(".tests").empty();

		$("#textbox").val(s);	
		$(".function-name").text(challenge.functionName);
		$(".function-number").text(challengeNumber);
		$("#description").html(toDescription(challenge.description));
		$("#example").html(toDescription(challenge.example));
		challenge.inputs.forEach(function(input) {
			 var node = $(".templates .input").clone();

			 node.find("h4").html("[input] " + input.param);
			 node.find("p").html(toDescription(input.text));

			 $("#inputs").append(node);
		});

		$("#output").html(toDescription(challenge.output));


		i=0;
		challenge.tests.forEach(function(test) {
			var node = $(".templates .test").clone()
			node.find(".title").html("Test " + i++);

			var s = "";
			first = true;
			challenge.inputs.forEach(function(input,i) {
				if (!first) {
					s+=", ";
				}
				s+=input.param + ": " +str(test[0][i]);

				first = false;
			});
			node.find(".param").html(s);
			node.find(".expected-result").html(str(test[1]));

			$(".tests").append(node);
		});

		count();
	});
}

reset(challengeNumber);

// Press tab on textbox
$(document).on('keydown', '#textbox', function(e) {
  var keyCode = e.keyCode || e.which;

  if (keyCode == 9) {
    e.preventDefault();
    var start = $(this).get(0).selectionStart;
    var end = $(this).get(0).selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    $(this).val($(this).val().substring(0, start)
                + "\t"
                + $(this).val().substring(end));

    // put caret at right position again
    $(this).get(0).selectionStart =
    $(this).get(0).selectionEnd = start + 1;
  }
});


$(document).on("keyup","#textbox",count);

$(document).on("click", ".reload", function () {
	$("#textbox").val("function " + challenge.functionName + "(" + challenge.inputs.map(a=>a.param).join`,`+ ") { \n\t\n}");
})

$(document).on("click", ".header", function () {
	$(this).next().slideToggle();
})

$(document).on("click", ".save",function () {
	localStorage.setItem(challenge.functionName,$("#textbox").val());
});

$(document).on("click", ".run",function () {
	if ($(".run").hasClass("rotate")) {
		return;
	}
	$(".run").addClass('rotate');
	s=$("#textbox").val();

	sum=0;
	results=[];
	a = []
	
	for (var i = 0; i< challenge.tests.length; i++) {
		(function (i) {
			var test = challenge.tests[i];
			var timeout;

			var worker = new Worker("worker.js");		
			
			worker.postMessage({param: test[0], str: s, fn: challenge.functionName, expectedResult: challenge.tests[i][1]});
			
			timeout = setTimeout(function () {
				worker.terminate();
				
				setResult({error: "Exceeded time alowed for test (" +challenge.secondsPerTest +"s)"}, i);
				
				a.push(i);
				
				if (a.length === challenge.tests.length){
					if (sum==challenge.tests.length) {
						$("#answer").html("Success! you passed " + challenge.tests.length+ "/" + challenge.tests.length + " tests.")
					} else {
						$("#answer").html("Failure! you only passed " + sum + "/" + challenge.tests.length + " tests.")
					}
					$(".run").removeClass('rotate');
				}
			},challenge.secondsPerTest * 1000);
			
			worker.addEventListener('message', function(e) {
				clearTimeout(timeout);
				(e.data.result !==undefined) && (e.data.result = JSON.parse(e.data.result));
				e.data.console = JSON.parse(e.data.console);
				setResult(e.data, i);
				a.push(i);
				
				if (a.length === challenge.tests.length){
					if (sum==challenge.tests.length) {
						$("#answer").html("Success! you passed " + challenge.tests.length+ "/" + challenge.tests.length + " tests.")
					} else {
						$("#answer").html("Failure! you only passed " + sum + "/" + challenge.tests.length + " tests.")
					}
					$(".run").removeClass('rotate');
				}
			});
		}(i));
	}	
});

function str(a) {
	s = JSON.stringify(a)
	
	if (a === null ) {
		return "null";
	} else if (a === undefined) {
		return "undefined"
	} else if (a instanceof Array) {
		return "[" +s.substring(1,s.length-1) + "]";
	}
	
	return s;
}


// Count the number of charcters excluding 
function count() {
	var length = $("#textbox").val().replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '').replace("", "").replace(/\s/g, '').length;
	
	$("#count").html(length)
}

function toDescription(str) {
	return str.replace(new RegExp("`([^`]*)`","g"),"<span class='special'>$1</span>")
}

function setResult(result,i) {
	var node = $(".tests .test:nth-child("+(i+1)+")");
	r = result.result;
	node.find(".error-message").text(result.error || "");
	node.find(".result").text(str(result.result));
	if (result.success) {
		node.addClass("success");
		node.removeClass("error");
		node.find(".body").slideUp()
	} else {
		node.addClass("error");
		node.removeClass("success");
		node.find(".body").slideDown()
	}

	var cnode = node.find(".console");
	cnode.empty();
	result.console && result.console.values.forEach(function (line) {
		var consoleLineNode = $(".templates .console-line").clone();
		
		consoleLineNode.text(line.data.map(val=>str(val)).join(" "));
		consoleLineNode.addClass("console-" + line.type)
		cnode.append(consoleLineNode);
	});

	result.success && sum++;
}


/*!
    query-string
    Parse and stringify URL query strings
    https://github.com/sindresorhus/query-string
    by Sindre Sorhus
    MIT License
*/
(function () {
    'use strict';
    var queryString = {};

    queryString.parse = function (str) {
        if (typeof str !== 'string') {
            return {};
        }

        str = str.trim().replace(/^\?/, '');

        if (!str) {
            return {};
        }

        return str.trim().split('&').reduce(function (ret, param) {
            var parts = param.replace(/\+/g, ' ').split('=');
            var key = parts[0];
            var val = parts[1];

            key = decodeURIComponent(key);
            // missing `=` should be `null`:
            // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
            val = val === undefined ? null : decodeURIComponent(val);

            if (!ret.hasOwnProperty(key)) {
                ret[key] = val;
            } else if (Array.isArray(ret[key])) {
                ret[key].push(val);
            } else {
                ret[key] = [ret[key], val];
            }

            return ret;
        }, {});
    };

    queryString.stringify = function (obj) {
        return obj ? Object.keys(obj).map(function (key) {
            var val = obj[key];

            if (Array.isArray(val)) {
                return val.map(function (val2) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(val2);
                }).join('&');
            }

            return encodeURIComponent(key) + '=' + encodeURIComponent(val);
        }).join('&') : '';
    };

    queryString.push = function (key, new_value) {
    var params = queryString.parse(location.search);
    params[key] = new_value;
    var new_params_string = queryString.stringify(params)
    history.pushState({}, "", window.location.pathname + '?' + new_params_string);
  }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = queryString;
    } else {
        window.queryString = queryString;
    }
})();
