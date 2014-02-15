//global calculator object:
var calc = new Calculator();

//onload event handler:
$(document).ready(function() {
	//button onclick: clear the screen and show calculator (if inputs='admin'/'admin').
	$('#authButton').click(function() {
		if($('#username').val() === 'admin' && $('#password').val() === 'admin') {
			$('#midbox').css('display','none');
			$('#amusing').css('display','none');
			$('#calc').css('display','block');
		}
	});

	//bind event handlers to calculator buttons:
	$('#calcAdd').click(calc.add);
	$('#calcMul').click(calc.multiply);
	$('#calcSettings').click(calc.settings);
	$('#calcClear').click(calc.clear);

	//bind onkeydown event to validate input while typing:
	$('#calcInput').keyup(function() {
		validateInput('#calcInput',false);
	});
	$('#calcDefaultVal').keyup(function() {
		validateInput('#calcDefaultVal',true);
	});

	//create calculator settings dialog for future use:
	$('#calcSettingsDialog').dialog({
      	autoOpen: false,
      	modal: true,
      	title: "Calculator Settings",
      	show: "fade",
    });

	//disable input to the calculator screen:
    $('#calcScreen').prop('disabled',true);
});

function validateInput(inputID, allowNeg) {
	var nonNegRegex = /^\d*$/;
	var intRegex = /^\-?\d*$/
	if(allowNeg === false) {
		if(nonNegRegex.test($(inputID).val()) === false) {
			alert("Input should only include non-negative integers!");
			$(inputID).val("");
		}
	} else {
		if(intRegex.test($(inputID).val()) === false) {
			alert("Input should be an integer!");
			$(inputID).val("");
		}
	}
}

function Calculator() {
	//private members:
	var val = 0;
	var defaultVal = 0;

	//public members:
	this.add = function() {
		var inputNum = parseInt($('#calcInput').val(),10);
		if(isNaN(inputNum)) {
			inputNum = 0;
		}
		val += inputNum;
		$('#calcScreen').val(val);
	}
	this.multiply = function() {
		var inputNum = parseInt($('#calcInput').val(),10);
		if(isNaN(inputNum)) {
			inputNum = 0;
		}
		val *= inputNum;
		$('#calcScreen').val(val);
	}
	this.settings = function() {
		$('#calcSettingsDialog').dialog({
	      	buttons: [
	      		{
	      			text: "Set Default Value",
	      			class: "calcSettingsButton",
	      			click: function() {
	      				if(isNaN(parseInt($('#calcDefaultVal').val(),10))) {
	      					alert("Input should be an integer!");
							$('#calcDefaultVal').val("");
	      				} else {
			      			defaultVal = parseInt($('#calcDefaultVal').val(),10);
			      			$(this).dialog("close");
			      		}
		      		}
	      		},
	      		{
	      			text: "Cancel",
	      			class: "calcSettingsButton",
	      			click: function() {
	      				$(this).dialog("close");
	      			}
	      		}
	      	]
	     });
	     $('#calcSettingsDialog').dialog("open");		
	}
	this.clear = function() {
		val = defaultVal;
		$('#calcScreen').val(defaultVal);
		$('#calcInput').val("");
	}
}
