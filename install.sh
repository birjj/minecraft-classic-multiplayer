#!/usr/bin/env bash
TARGET=/etc/systemd/system/minecraft-classic.service
CUR_PATH=`pwd`
NODE=$(realpath $(which node))
USER=`whoami`

[[ -z "$CUR_PATH" ]] && { echo -e "\e[31mCouldn't get current path\[0m"; exit 1; }
[[ -z "$NODE" ]] && { echo -e "\e[31mCouldn't get path to node\[0m"; exit 1; }
[[ -z "$USER" ]] && { echo -e "\e[31mCouldn't get current user\[0m"; exit 1; }
[[ -x `which systemctl` ]] || { echo -e "\e[31mThis install script only works if systemd is installed\e[0m"; exit 1; }
[[ -x `which npm` ]] || { echo -e "\e[31mNode and NPM are required\e[0m"; exit 1; }

# install dependencies
echo "Installing dependencies"
npm install

echo "Compiling"
npm run build

# install .service
echo ""
echo "Installing service to $TARGET"
sudo cp ./minecraft-classic.service $TARGET
echo "Setting <path-goes-here> to $CUR_PATH"
sudo sed -i "s@<path-goes-here>@$CUR_PATH@g" $TARGET
echo "Setting <path-to-node> to $NODE"
sudo sed -i "s@<path-to-node>@$NODE@g" $TARGET
echo "Setting <user-goes-here> to $USER"
sudo sed -i "s@<user-goes-here>@$USER@g" $TARGET
echo "Setting <group-goes-here> to $USER"
sudo sed -i "s@<group-goes-here>@$USER@g" $TARGET

echo ""
echo "Reloading systemd"
sudo systemctl daemon-reload
echo "Starting minecraft-classic"
sudo systemctl start minecraft-classic
echo "Enabling minecraft-classic so it starts on reboot"
sudo systemctl enable minecraft-classic

echo ""
echo -e "\e[32mDone\e[0m"
echo -e "Update the configuration in package.json and then run\n  \e[36msudo systemctl restart minecraft-proxy\e[0m"