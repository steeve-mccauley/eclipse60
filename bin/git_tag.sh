#!/bin/bash
#
# ./bin/git_tag.sh
#

ME=$(basename $0)
MD=$(cd $(dirname $0); pwd)

test=""

info() {
	echo -e "${test} > $*"
}

[ $# -lt 2 ] && test="DRYRUN" # && info -e "set > 1 parameters to create tag"

info $MD
cd $MD/../eclipse60@blackjackshellac.ca
[ $? -ne 0 ] && echo "Failed to change to extension directory" && exit 1

info Working in $(pwd): $#

gsv=$(gnome-shell --version | cut -f1,2 -d'.' | sed 's/[a-z ]//gi')
gsv=$(cat metadata.json | ruby -rjson -e 'puts JSON.parse(STDIN.read)["shell-version"].join("_").gsub(/[.]/,"_")')
ver=$(cat metadata.json | ruby -rjson -e 'puts JSON.parse(STDIN.read)["version"]')
ver=$(echo -n $ver)

msg="eclipse ver$ver for Gnome Shell $gsv"
tag_name=$(echo -n $msg | sed 's/[ \.]/_/g')
info git tag -a $tag_name -m "$msg"

[ $# -lt 1 ] && git tag -a $tag_name -m "$msg"

info Tags ...
git tag
