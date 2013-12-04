function skCallback(data){
	console.log("data Called");

}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/****
	User Experienced Coating
*****/

function UI_init() {

//Make Dropdown navigation
	$(".top_nav li").hover( function(){
		$(this).find(".subNav").stop().slideDown(200);
	}, function(){
		$(this).find(".subNav").stop().slideUp(550);
	});

//Alive Flash Messages Control
	$(".flash span").bind("click", function(){
		$(this).parent().fadeOut('slow');

	});

//Disapper Flash Message after 1 minute

	if( $(".flash").length > 0  ){
		setTimeout( function(){
		//	$(".flash").fadeOut('slow');
		}, "5000");
	}
//Adjust footer position
	if( $(window).height() > $(".site_wrapper").height() )
		$(".footer").css({ 'position': 'fixed', 'bottom' :'0'});


// Docker:list.ejs
	if( $("#hostList").length >0 ){
		$("#hostList").find("option[value='"+ getParameterByName("hostId") +"']").attr("selected", "selected");
		$("#hostList").bind("change", onServerChange);
	}

	if(  $("#includeAllResults").length > 0){
			$("#includeAllResults").bind("change", onServerChange);

	}


}


//docker:list.ejs
 // callback on serverlist change
function onServerChange(){

	var queryString = "?all=" + ( $("#includeAllResults").is(":checked")?"1":"0" );

	window.location.href = window.location.origin + "/hosts/" + $("#hostList").find("option:selected").val() + "/dockers/list" + queryString;

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
				var address =  $(row).find("td").eq(3).text();
				var $statusPlaceholder = $(row).find("td").eq(6);

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