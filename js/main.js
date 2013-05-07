var sd,that;
$(document).ready(function() {
    $.tf = function($el) {
        that                            = this;
        this.$el                        = $el;
        this.turn                       = 'p1';
        this.currentPlayer              = {};
        this.blockClicks                = false;//prevent players from making moves
        this.playerList                 = [];
        this.accessorPattern            = /R([0-9])C([0-9])/;
        this.playableLetters            = ''
        this.boardSelector              = '.bd';
        this.headerSelector             = 'header';
        this.numRows                    = 10;
        this.numCols                    = 8;
        this.lastTileClicked            = {};
        this.lastTilePreviewed          = {};
        this.client                     = {};
        this.model                      = {
            'current'                       : {},
            'preview'                       : {}
        };

        this.gameMode                   = 'BLOOM'//CLASSIC-SURROUNDED-LOCK,CLASSIC-TOUCHING-LOCK,BLOOM,BLOOM-PLUs,MAZE,RANDOM,SCATTER
        this.view                       = {};
        this.Templates                  = {};
        this.Templates.Board            = Handlebars.compile($("#board-template").html());
        this.Templates.Head             = Handlebars.compile($("#header-template").html());
        this.Models                     = {};
        this.Models.Board               = function() {
            this.rows                       = [];
        };

        this.Models.Owner                   = function() {
            this.name           = null,
            this.num            = 0,
            this.class          = 0
        };

        this.Models.Tile                = function() {
            this.row                        = null;
            this.col                        = null;
            this.letter                     = null;
            this.status                     = 'neutral';
            this.accessor                   = null;
            this.owner                      = null;
        }

        this.Models.Client              = function($el) {
            var thisClient                  = this;
            this.perspective                = null;
            this.isPortrait                 = null;
            this.isLandscape                = null;
            this.viewport                   = {
                w:  0,
                h:  0
            };
            this.container                  = {
                w   : 0,
                h   : 0,
                m   : 0,
                p   : 0
            }
            this.header                     = {
                w   : 0,
                h   : 0
            }
            this.tile                       = {
                w   : 0,//width
                h   : 0,//height
                m   : 0,//margin
                p   : 0//padding
            }
            this.applySizing          = function() {
                $el.find(that.headerSelector).css({height:this.header.h, width: this.header.w});
                $el.find(that.boardSelector).css({height:this.container.h, width: this.container.w, margin: this.container.m,padding: this.container.p});
                $el.find('.col').css({height:this.tile.h, width: this.tile.w, margin: this.tile.m,lineHeight: this.tile.h + "px"});
            }
            this.determineTileSize          = function(cpn) {
                //cpn is the container padding, so that needs to work out
                var spacePerTile;

                capByWidth  = ((thisClient.viewport.w ) / that.numCols);
                capByHeight = ((thisClient.viewport.h - thisClient.header.h) / that.numRows);

                if(capByHeight < capByWidth) spacePerTile = capByHeight;
                else spacePerTile = capByWidth;

                var ts = Math.ceil(spacePerTile *.92);//tile size
                var tm = Math.ceil(spacePerTile *.015);//tile padding

                thisClient.tile = {
                    w   : ts,
                    h   : ts,
                    m   : tm
                };

            };
            this.determineSizes             = function() {
                var cpn = 10;//container padding as an int
                this.isPortrait     = !!(this.viewport.h > this.viewport.w);
                this.isLandscape    = !!(this.viewport.h < this.viewport.w);
                this.viewport.h     = $el.parent().parent().height();
                this.viewport.w     = $el.parent().parent().width();

                this.header.h       = $el.find('header').outerHeight();
                this.header.w       = this.viewport.w;

                this.determineTileSize(cpn);

                this.container.p    = '5px 0';
                this.container.h    = this.viewport.h - this.header.h - (cpn*2);
                this.container.w    = ((this.tile.w + (this.tile.m * 2)) * that.numCols) + (cpn*2);
                this.container.m    = '0 ' + ((this.viewport.w - (this.tile.w + (this.tile.m * 2)) * that.numCols) / 2) + 'px';
                this.applySizing();
            }
            this.init                       = function() {
                this.determineSizes();
            };

            this.init();
        };

        this.Models.Row                 = function() {
        };

        this.randomString               = function(len, charSet) {
            len = len || 1;
            charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            var randomString = '';
            for (var i = 0; i < len; i++) {
                var randomPoz = Math.floor(Math.random() * charSet.length);
                randomString += charSet.substring(randomPoz,randomPoz+1);
            }
            return randomString;
        }

        this.init                       = function() {
            var p1 = new this.Models.Owner;
            p1.name         = 'B-dizzle';
            p1.num          = 1;
            p1.class        = 'p1';
            p1.isCurrent    = true;

            var p2 = new this.Models.Owner;
            p2.name         = 'C-tizzle';
            p2.num          = 2;
            p2.class        = 'p2';
            p2.isCurrent    = false;

            this.playerList[0] = p1;
            this.playerList[1] = p2;
            this.currentPlayer = 0;

            var modelToSave = new this.Models.Board;
            for(row=0;row<this.numRows;row++) {//                       create rows
                modelToSave.rows[row] = new this.Models.Row;
                for(col=0;col<this.numCols;col++) {//                   create cols inside rows
                    var newTile         = new this.Models.Tile();
                    newTile.row         = row;
                    newTile.col         = col;
                    newTile.accessor    = 'R'+row+'C'+col;
                    newTile.letter      = this.randomString();
                    modelToSave.rows[row][col] = newTile;
                }
            }

            this.model.current = modelToSave;//                                 save to model
            this.model.preview = new this.Models.Board;//                                 save to model


            this.declareHelpers();
            this.render();//                                       fire renderBoard

            this.client = new this.Models.Client(this.$el);
            this.render();//                                       fire renderBoard
        };

        this.render                     = function(preview) {
            //make sure the game hasn't ended (all tiles taken)
            if(this.$el.find('.col.p1,.col.p2').length < (this.numRows * this.numCols)) {
                var modelToUse;

                if(typeof preview === 'undefined') preview = false;
                preview ? modelToUse = this.model.preview : modelToUse = this.model.current;
                this.view.board = this.$el.find(this.boardSelector).html(this.Templates.Board(modelToUse));
                this.view.header = this.$el.find(this.headerSelector).html(this.Templates.Head(modelToUse));
                this.bind();
                if(typeof this.client !== 'undefined' && this.client.isPortrait != null) this.client.applySizing();
            }
            else this.endGame();
        };

        this.generateAccessor           = function(row,col) {
            return 'R' + row + 'C' + col;
        };

        this.parseAccessor              = function(accessor) {

            var result = this.accessorPattern.exec(accessor);

            var returnData =  {
                row: result[1],
                col: result[2]
            };
            return returnData;
        };

        this.parseAccessorFromRawClass  = function(rawClass) {
            var result = this.accessorPattern.exec(rawClass);
            return result[0];
        }

        this.getByAccessor              = function(accessor,preview) {
            if(typeof preview === 'undefined') preview = false;
            preview ? modelToUse = this.model.preview : modelToUse = this.model.current;
            var loc = this.parseAccessor(accessor);

            return modelToUse['rows'][loc.row][loc.col];
        }
        this.getByRC                    = function(row,col,preview) {
            var modelToUse;
            if(typeof preview === 'undefined') preview = false;
            preview ? modelToUse = this.model.preview : modelToUse = this.model.current;
            return modelToUse['rows'][row][col];
        }
        this.setByRC                    = function(row,col,Tile,preview) {
            var modelToUse;
            if(typeof preview === 'undefined') preview = false;
            this.model.current['rows'][Tile.row][Tile.col] = Tile;
        }
        this.setByAccessor              = function(accessor,Tile,preview) {
            if(typeof Tile.accessor !== 'undefined') {
                var modelToUse;
                if(typeof preview === 'undefined') preview = false;
                var loc = this.parseAccessor(Tile.accessor);

                modelToUse = this.model.current['rows'][Tile.row][Tile.col];
                preview ? this.model.preview =  modelToUse : this.model.current = modelToUse;
            }
        }

        this.bind                       = function() {
            //$('.row .col',$el).mousedown(function(e) {       that.previewMove(e);});
            $('.row .col',$el).mouseup(function(e) {         that.makeMove(e);});
            $(window).resize(function() {
               that.client.determineSizes();
               that.client.applySizing();
            });
        }
        this.getScoreForPlayer          = function(playerNum) {
            return this.$el.find('.col.p' + playerNum).length;
        }
        this.declareHelpers             = function() {
            var that = this;
            Handlebars.registerHelper('playerScore', function(playerNum) {
                return that.getScoreForPlayer(playerNum);
            });
            Handlebars.registerHelper('activePlayerClass', function(playerNum) {
                return 'p'+(that.currentPlayer+1)+'Active';
            });
        }

        this.previewMove                = function(e) {
//            if($(e.target).hasClass('col')) {
//                var accessor = this.parseAccessorFromRawClass(e.target.className);
//                var Tiles = this.determineAffectedSquares(this.getByAccessor(accessor));
//                this.claimSquares(Tiles);
//                this.render();
//            }
        };

        this.makeMove                   = function(e){
            if($(e.target).hasClass('col') && !$(e.target).hasClass('locked') && !this.blockClicks) {
                this.blockClicks = true;
                var accessor = this.parseAccessorFromRawClass(e.target.className);
                var Tile  = this.getByAccessor(accessor);
                var Tiles = that.determineAffectedSquares(Tile);
                var affectedTiles  = [];

                this.claimSquares(Tiles,true);

                for(i=0;i<Tiles.length;i++) {
                    if(typeof Tiles[i] != 'undefined' && typeof Tiles[i].accessor != 'undefined') {
                        affectedTiles.push('.'+Tiles[i].accessor);
                    }
                }
                var br=this;//maintain backref
                $(affectedTiles.join(', ').replace(accessor,'null')).switchClass('' , "p" + (this.currentPlayer +1 ), 200);
                $('.'+accessor).switchClass("neutral" , "locked", 400);
                $('.'+accessor).switchClass("" , "p" + (this.currentPlayer +1 ), 400);
                window.setTimeout('tf.render()', 400);
                window.setTimeout('tf.endTurn()',400);
                window.setTimeout('tf.blockClicks = false',400);
            }
        };
        this.getSurroundedTiles         = function() {
            var surroundedTiles=[];//surrounded files array
            var ownedTiles=[];
            for(row=0;row<this.numRows;row++) {//                       create rows
                for(col=0;col<this.numCols;col++) {//                   create cols inside rows
                    if(typeof this.model.current['rows'][row][col].owner !== 'undefined' && this.model.current['rows'][row][col].owner != null) {
                        tiles=[];
                        if(row != 0) tiles.push(this.model.current['rows'][row-1][col]);//                   if not in top row get col num above
                        if(col != 0) tiles.push(this.model.current['rows'][row][col-1]);//                     if not in top row get col num to left
                        if(row < this.numRows - 1) tiles.push(this.model.current['rows'][row+1][col]);//     if not on right col get col to right
                        if(col < this.numCols - 1) tiles.push(this.model.current['rows'][row][col+1]);//     if not on bottom row get bottom col
                        //iterate every col
                        for(i=0;i<tiles.length;i++) {
                            if(typeof tiles[i].owner !== 'undefined' && tiles[i].owner != null) {
                                if(tiles[i].owner.num == this.model.current['rows'][row][col].owner.num) ownedTiles.push(tiles[i]);
                            }
                        }
                        if(tiles.length == ownedTiles.length && ownedTiles.length != 0)
                        {
                            var surroundedTile = this.getByRC(row,col);
                            surroundedTile.status = 'locked';
                            surroundedTiles.push(surroundedTile);
                        }
                    }

                }
            }
            return surroundedTiles;
        }


        this.getTouchingTiles           = function() {

        }
        this.determineAffectedSquares   = function(Tile) {
            var as= [];//                   affected squares

            switch(this.gameMode) {
                case 'CLASSIC-SURROUNDED-LOCK' :
                    as.concat(this.getSurroundedTiles());
                    break;
                case 'BLOOM' :
                    if(Tile.row != 0) {//            if not in top row get col num above
                        as.push(this.model.current.rows[Tile.row-1][Tile.col]);
                    }
                    if(Tile.col != 0) {//            if not in top row get col num to left
                        as.push(this.model.current.rows[Tile.row][Tile.col-1]);
                    }
                    if(Tile.row < this.numRows - 1) {//            if not on right col get col to right
                        as.push(this.model.current.rows[Tile.row+1][Tile.col]);
                    }
                    if(Tile.col < this.numCols - 1) {//            if not on bottom row get bottom col
                        as.push(this.model.current.rows[Tile.row][Tile.col+1]);
                    }
                    //make sure none of the squares are mo
                    for(i=0;i<as.length;i++) if(as[i].status == 'locked') as.splice(i,1);

                    Tile.status = 'locked';
                    break;
            }


            as.push(Tile);
            return as;
        }

        this.claimSquares              = function(Tiles,preview) {
            var modelToUse;
            if(typeof preview === 'undefined') preview = false;

            for(i=0;i<Tiles.length;i++) this.claimSquare(Tiles[i],preview);
        }

        this.claimSquare                 = function(Tile,preview) {
            var backRef = this;
            var modelToUse;
            Tile.owner = this.playerList[this.currentPlayer];
            this.setByRC(Tile.row,Tile.col, Tile, preview);
        }
        this.endTurn                    = function() {
            if(this.currentPlayer < (this.playerList.length - 1)) this.currentPlayer++;
            else this.currentPlayer = 0;
            console.log('player '+this.currentPlayer+'\'s turn.');
        }
        this.endGame                    = function() {
            if(this.getScoreForPlayer(0) < this.getScoreForPlayer(1)) {
                alert('Player 1 (blue) wins!')
            }
            else {
                alert('Player 2 (red) wins!')
            }
            window.location.reload();
        }
        this.init();
    }
    tf = new $.tf($('#main_contain'));
});
