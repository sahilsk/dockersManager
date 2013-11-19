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

	//If host_list table exist
	if( $("#hostList").length ){
		//Get hosts live status
		var $hostTable = $("#hostList");
		var $rowArray = $hostTable.find("tbody tr");
		$.each($rowArray, function(index, row){
			if( $(row).find("td").length){
				var address =  $(row).find("td").eq(2).text();
				var $statusPlaceholder = $(row).find("td").eq(5);

				$.ajax( {
					url: "getServerStatus",
					type:"GET",
					data: "address="+ $.trim(address),
					success: function(response){
						console.log(  address,  ":" , response);
						$statusPlaceholder.text( response);
					}
				});

			}

		});

	}// end '#hostList'


});