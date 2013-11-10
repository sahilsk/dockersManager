function skCallback(data){
	console.log("data Called");

}


/****
	User Experienced Coating
*****/

function UI_init() {


//Alive Flash Messages Control
	$(".flash span").bind("click", function(){
		$(this).parent().fadeOut('slow');

	});

//Disapper Flash Message after 1 minute

	if( $(".flash").length > 0  ){
		setTimeout( function(){
			$(".flash").fadeOut('slow');
		}, "5000");
	}

}





$(document).ready( function(){

	console.log("Init...");

	UI_init();


});