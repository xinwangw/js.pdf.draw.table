//
var PdfDrawTable = function(pdf, format, tableStyle){
	var defaultTableStyle = {
		font: {
			size:10,
			width:5,
			height:10},
		margin: {
			left:20,
			right:10,
			top:20,
			bottom:20
		},
		cell: {
			paddingLeft:2,
			paddingRight:2,
			paddingTop:2,
			paddingBottom:2
		}
	};
	this.pdf = pdf;
	this.tableStyle = defaultTableStyle || tableStyle;
	this.format = format;
	this.currentRowTop = 0;
	this.currentRowBottom = this.tableStyle.margin.top;
	this.currentColumnRight = this.tableStyle.margin.left;
	this.currentLines = 1;
	this.fontSize = 10;
	this.tableWidth = 0;
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var pageFormats = { // Size in pt of various paper formats
                'a3': [841.89, 1190.55],
                'a4': [595.28, 841.89],
                'a5': [420.94, 595.28],
                'letter': [612, 792],
                'legal': [612, 1008]
            };
	var pageSize = eval('pageFormats.'+format);

	this.init = function(){
		this.pdf.setFontSize(this.tableStyle.font.size);
		this.pdf.setFont("times");
		this.pdf.setFontType("normal");
		return this;
	};

	this.drawColumn = function(text,width) {
		var tx = this.currentColumnRight+this.tableStyle.cell.paddingLeft;
		var ty = this.currentRowTop+this.tableStyle.cell.paddingTop+this.fontSize;

		var tw = width;
		console.log("text width:"+tw);
		var lines = this.pdf.splitTextToSize(text, tw);
		this.pdf.text(tx, ty, lines);
		this.currentColumnRight = tx+tw+this.tableStyle.cell.paddingRight;
		console.log("currentColumnRight:"+this.currentColumnRight);
		//right line
		this.pdf.line(this.currentColumnRight,
			this.currentRowTop,
			this.currentColumnRight,
			this.currentRowBottom);
		return this;
	};

	this.drawRow = function(y,width){
		y = this.currentRowBottom+y;
		var left = this.tableStyle.margin.left;
		var right = this.tableStyle.margin.right;
		var bottom = this.tableStyle.margin.bottom;
		var fontHeight = this.fontSize;
		var yOfBottomLine = y+(fontHeight+this.tableStyle.cell.paddingTop+this.tableStyle.cell.paddingBottom)*this.currentLines;
		if (y>pageSize[1] || yOfBottomLine>pageSize[1]) {
			this.pdf.addPage();
			yOfBottomLine -= y;
			y = this.tableStyle.margin.top;
			yOfBottomLine += y;
		}
		if (width<=0)
			width=pageSize[0]-right;
		else
			width+=left;
		// top line
		if (y>0)
			this.pdf.line(left,y,width,y);
		console.log("draw row top line: "+left+" "+y+" "+width+" "+y);
		// left line
		this.pdf.line(left,y,left,yOfBottomLine);
		console.log("draw row left line: "+left+" "+y+" "+left+" "+yOfBottomLine);
		this.currentRowTop = y;
		this.currentRowBottom = yOfBottomLine;
		this.currentColumnRight = left;
		// bottom line
		this.pdf.line(left,this.currentRowBottom,width,this.currentRowBottom);
		return this;
	};

	this.drawRowBackground=function(width, fillcolor){
		// row background
		this.pdf.setDrawColor(fillcolor.r,fillcolor.g,fillcolor.b);
		this.pdf.setFillColor(fillcolor.r,fillcolor.g,fillcolor.b);
		this.pdf.rect(this.tableStyle.margin.left+.5,this.currentRowTop+1,width-1,this.currentRowBottom-this.currentRowTop-2,'F');
		console.log("drawRowBackground currentRowBottom:"+this.currentRowBottom);
		this.pdf.setDrawColor(0);
		this.pdf.setFillColor(255,255,255);
		return this;
	};

	this.setFont=function(font){
		var setting = font.split(' ');
		console.log("font type:"+setting[0]);
		this.pdf.setFontType(setting[0]);
		console.log("font size:"+setting[1]);
		this.pdf.setFontSize(Number(setting[1]));
		console.log("font:"+setting[2]);
		this.pdf.setFont(setting[2]);
		this.fontSize = Number(setting[1]);
	};

	this.drawHeader=function(y,tableData) {
		var tableWidth = 0;
		var numOfLines = 0;
		var pdf = this.pdf;
		var o = this;
		$.each(tableData.header.data, function(i, h) {
    		tableWidth+=h.width+o.tableStyle.cell.paddingLeft+o.tableStyle.cell.paddingRight;
    		o.setFont(tableData.header.font);
    		var lines = pdf.splitTextToSize(h.name, h.width);
    		numOfLines = (numOfLines<lines.length) ? lines.length : numOfLines;
		});
		o.currentLines = numOfLines;

		this.drawRow(y,tableWidth);
		this.drawRowBackground(tableWidth,tableData.header.backgroundColor);
		$.each(tableData.header.data, function(i, h) {
			o.drawColumn(h.name,h.width);
		});
		this.tableWidth = tableWidth;
		return this;
	}

	this.draw=function(y,tableData){
		//this.init();
		var tableWidth = 0;
		var numOfLines = 0;
		var pdf = this.pdf;
		var o = this;

		this.drawHeader(y,tableData);
		var tableWidth = this.tableWidth;
		$.each(tableData.body.data, function(i, tr) {
			numOfLines = 0;
			$.each(tr, function(i, td) {
				o.setFont(tableData.body.font);
				var lines = o.pdf.splitTextToSize(td, tableData.header.data[i].width);
				numOfLines = (numOfLines<lines.length) ? lines.length : numOfLines;
			});
			o.currentLines = numOfLines;
			var lastBottomLine = o.currentRowBottom;
			var predictBottomLine = lastBottomLine+(o.fontSize+o.tableStyle.cell.paddingTop+o.tableStyle.cell.paddingBottom)*o.currentLines;
			if (predictBottomLine>pageSize[1]-o.tableStyle.margin.bottom) {
				pdf.addPage();
				o.currentRowBottom = o.tableStyle.margin.top;
				if (tableData.header.img)
					o.pdf.addImage(tableData.header.img.data,"JPEG",o.tableStyle.margin.left,o.tableStyle.margin.top,
						tableData.header.img.width,
						tableData.header.img.height);

				o.drawHeader(y,tableData);
				o.setFont(tableData.body.font);
				o.currentLines = numOfLines;
			}
			o.drawRow(0,tableWidth);
			if ((i+1)%2==0) {
				o.drawRowBackground(tableWidth,tableData.body.evenRowBackgroundColor);
			} else {
				o.drawRowBackground(tableWidth,tableData.body.oddRowBackgroundColor);
			}
			$.each(tr, function(i, td) {
				o.drawColumn(td,tableData.header.data[i].width);
			});
		});
	};

	this.getImageBase64 = function(url, callback){
	    var img = new Image();
	    //img.crossOrigin="Anonymous";
	    img.onload = function(){
	        var dataURL;
	        canvas.height = this.height;
	        canvas.width = this.width;
	        context.drawImage(this, 0, 0);
	        dataURL = canvas.toDataURL("image/jpeg");
	        callback(dataURL, this.width, this.height);
	        canvas = null;
	    };
	    img.src = url;
	};
};
function table(){
	// A4		 595x842 in pt
    var pdf = new jsPDF('p','pt','a4');
    var drawTable = new PdfDrawTable(pdf,'a4');
    drawTable.init();


    var tableData = {
    	header:{
    		font: "bold 32 times",
    		backgroundColor: {r:238,g:238,b:238},
    		data:[
	    		{name:"column 1",width:60},
	    		{name:"column 2",width:60},
	    		{name:"column 3",width:160},
	    		{name:"column 4",width:160}
    		]
    	},
    	body:{
    		font: "normal 10 times",
    		oddRowBackgroundColor:{r:255,g:255,b:255},
    		evenRowBackgroundColor:{r:238,g:238,b:238},
    		data:[
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1 ksdfjsdf  jlskdf  slkdjf","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj dfkjlsdf  ksljdf slf j lskjdfsdfj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf jkj sdfjljsdf jljfsdf jlksdf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"],
	    		["test 1","test 2","test 3","test 4"],
	    		["test 1","test 2","test 3","test 4j slkdjfsdflj lkj klsj flkj sfjkl jlsjf"]
    		]
    	}
    };
    var headerImgData,headerImgWidth,headerImgHeight;
    drawTable.getImageBase64("logo.jpg", function(data,w,h){
    	// console.log(data);
    	headerImgData = data;
    	headerImgWidth = w*.1;
    	headerImgHeight = h*.1;
    	pdf.addImage(data, 'JPEG', 20, 20, headerImgWidth, headerImgHeight);
    	tableData.header.img={
    		data : headerImgData,
    		width : headerImgWidth,
    		height : headerImgHeight
    	};
    	drawTable.draw(60,tableData);
		pdf.save('TestTable.pdf');
    });

}
