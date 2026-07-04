import java.awt.Color;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.File;
import java.io.IOException;
import javax.swing.ButtonGroup;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JMenu;
import javax.swing.JMenuBar;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JRadioButton;
import javax.swing.JTextField;

/**
 * Name: TODO
 * Student Number: TODO
 *
 * Simple GUI for the employee record system.
 */
public class MainForm extends JFrame implements ActionListener
{
    Store testStore = new Store(200);

    private JTextField nameField;
    private JTextField salaryField;
    private JTextField natInsField;
    private JTextField phoneField;
    private JTextField jobTitleField;

    private JRadioButton maleButton;
    private JRadioButton femaleButton;

    private JComboBox<String> birthDayBox;
    private JComboBox<String> birthMonthBox;
    private JComboBox<String> birthYearBox;
    private JComboBox<String> startDayBox;
    private JComboBox<String> startMonthBox;
    private JComboBox<String> startYearBox;

    private JLabel photoLabel;
    private JLabel messageLabel;

    private JButton enterButton;
    private JButton clearButton;
    private JButton pictureButton;

    private JMenuItem newItem;
    private JMenuItem saveItem;
    private JMenuItem openItem;
    private JMenuItem addItem;
    private JMenuItem displayItem;
    private JMenuItem clearItem;

    private int displayIndex;
    private int currentIndex;
    private boolean changed;

    /**
     * Builds the main window.
     */
    public MainForm()
    {
        super("Employee Record System");

        displayIndex = 0;
        currentIndex = -1;
        changed = false;

        setSize(600, 480);
        setLayout(null);
        setResizable(false);

        makeMenu();
        makeForm();

        setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        addWindowListener(new WindowAdapter()
        {
            public void windowClosing(WindowEvent e)
            {
                closeApplication();
            }
        });
    }

    private void makeMenu()
    {
        JMenuBar menuBar = new JMenuBar();

        JMenu fileMenu = new JMenu("File");
        newItem = new JMenuItem("New");
        saveItem = new JMenuItem("Save");
        openItem = new JMenuItem("Open");
        newItem.addActionListener(this);
        saveItem.addActionListener(this);
        openItem.addActionListener(this);
        fileMenu.add(newItem);
        fileMenu.add(saveItem);
        fileMenu.add(openItem);

        JMenu recordMenu = new JMenu("Record");
        addItem = new JMenuItem("Add");
        displayItem = new JMenuItem("Display");
        clearItem = new JMenuItem("Clear");
        addItem.addActionListener(this);
        displayItem.addActionListener(this);
        clearItem.addActionListener(this);
        recordMenu.add(addItem);
        recordMenu.add(displayItem);
        recordMenu.add(clearItem);

        menuBar.add(fileMenu);
        menuBar.add(recordMenu);
        setJMenuBar(menuBar);
    }

    private void makeForm()
    {
        JLabel titleLabel = new JLabel("Enter Employee Infomation");
        titleLabel.setBounds(185, 20, 240, 25);
        add(titleLabel);

        addLabel("Enter Name:", 20, 65);
        nameField = new JTextField();
        nameField.setBounds(150, 65, 130, 22);
        add(nameField);

        addLabel("Select Gender:", 20, 105);
        maleButton = new JRadioButton("Male");
        femaleButton = new JRadioButton("Female");
        maleButton.setBounds(150, 105, 60, 22);
        femaleButton.setBounds(215, 105, 80, 22);
        maleButton.setSelected(true);
        ButtonGroup genderGroup = new ButtonGroup();
        genderGroup.add(maleButton);
        genderGroup.add(femaleButton);
        add(maleButton);
        add(femaleButton);

        addLabel("Select Date Of Birth:", 20, 145);
        birthDayBox = new JComboBox<String>(makeNumbers(1, 31));
        birthMonthBox = new JComboBox<String>(makeNumbers(1, 12));
        birthYearBox = new JComboBox<String>(makeNumbers(1950, 2026));
        birthDayBox.setBounds(150, 145, 45, 22);
        birthMonthBox.setBounds(215, 145, 45, 22);
        birthYearBox.setBounds(280, 145, 60, 22);
        birthYearBox.setSelectedItem("2008");
        add(birthDayBox);
        add(birthMonthBox);
        add(birthYearBox);

        addLabel("Enter Salary:", 20, 185);
        salaryField = new JTextField();
        salaryField.setBounds(150, 185, 130, 22);
        add(salaryField);

        addLabel("Enter National Insurance No:", 20, 225);
        natInsField = new JTextField();
        natInsField.setBounds(150, 225, 130, 22);
        add(natInsField);

        addLabel("Enter Phone No:", 20, 265);
        phoneField = new JTextField();
        phoneField.setBounds(150, 265, 130, 22);
        add(phoneField);

        addLabel("Select Start Date:", 20, 305);
        startDayBox = new JComboBox<String>(makeNumbers(1, 31));
        startMonthBox = new JComboBox<String>(makeNumbers(1, 12));
        startYearBox = new JComboBox<String>(makeNumbers(2000, 2035));
        startDayBox.setBounds(150, 305, 45, 22);
        startMonthBox.setBounds(215, 305, 45, 22);
        startYearBox.setBounds(280, 305, 60, 22);
        startYearBox.setSelectedItem("2024");
        add(startDayBox);
        add(startMonthBox);
        add(startYearBox);

        addLabel("Enter Job Title:", 20, 345);
        jobTitleField = new JTextField();
        jobTitleField.setBounds(150, 345, 130, 22);
        add(jobTitleField);

        photoLabel = new JLabel("Picture", JLabel.CENTER);
        photoLabel.setBounds(390, 75, 170, 220);
        photoLabel.setOpaque(true);
        photoLabel.setBackground(new Color(198, 218, 238));
        add(photoLabel);

        pictureButton = new JButton("Please choose an Picture");
        pictureButton.setBounds(405, 320, 150, 25);
        pictureButton.addActionListener(this);
        add(pictureButton);

        enterButton = new JButton("Enter");
        clearButton = new JButton("Clear");
        enterButton.setBounds(60, 385, 80, 25);
        clearButton.setBounds(215, 385, 80, 25);
        enterButton.addActionListener(this);
        clearButton.addActionListener(this);
        add(enterButton);
        add(clearButton);

        messageLabel = new JLabel("");
        messageLabel.setBounds(330, 385, 240, 25);
        add(messageLabel);
    }

    private void addLabel(String text, int x, int y)
    {
        JLabel label = new JLabel(text);
        label.setBounds(x, y, 150, 22);
        add(label);
    }

    private String[] makeNumbers(int start, int end)
    {
        String[] numbers = new String[end - start + 1];
        int count = 0;
        for (int i = start; i <= end; i++)
        {
            numbers[count] = "" + i;
            count++;
        }
        return numbers;
    }

    /**
     * Handles button and menu clicks.
     *
     * @param e event object
     */
    public void actionPerformed(ActionEvent e)
    {
        Object source = e.getSource();

        if (source == enterButton || source == addItem)
        {
            addRecord();
        }
        else if (source == clearButton)
        {
            clearForm();
        }
        else if (source == pictureButton)
        {
            choosePicture();
        }
        else if (source == newItem)
        {
            newStore();
        }
        else if (source == saveItem)
        {
            saveStore();
        }
        else if (source == openItem)
        {
            openStore();
        }
        else if (source == displayItem)
        {
            displayNextRecord();
        }
        else if (source == clearItem)
        {
            deleteCurrentRecord();
        }
    }

    private void addRecord()
    {
        try
        {
            if (Store.isFull())
            {
                showError("Store full.");
                return;
            }

            Employee employee = readEmployeeFromForm();
            testStore.add(employee);
            changed = true;
            messageLabel.setText("Record added.");
        }
        catch (Exception ex)
        {
            showError("Please check the entered data.");
        }
    }

    private Employee readEmployeeFromForm()
    {
        String name = nameField.getText();
        char gender = 'M';
        if (femaleButton.isSelected())
        {
            gender = 'F';
        }

        Date dob = getDate(birthDayBox, birthMonthBox, birthYearBox);
        Date start = getDate(startDayBox, startMonthBox, startYearBox);

        Employee employee = new Employee(name, gender, dob, "", start);
        employee.setSalary(Float.parseFloat(salaryField.getText()));
        employee.setNatInsNo(natInsField.getText());
        employee.setPhone(phoneField.getText());
        employee.setJobTitle(jobTitleField.getText());
        return employee;
    }

    private Date getDate(JComboBox<String> dayBox, JComboBox<String> monthBox, JComboBox<String> yearBox)
    {
        int day = Integer.parseInt((String) dayBox.getSelectedItem());
        int month = Integer.parseInt((String) monthBox.getSelectedItem());
        int year = Integer.parseInt((String) yearBox.getSelectedItem());
        return new Date(day, month, year);
    }

    private void showEmployee(Employee employee)
    {
        nameField.setText(employee.getName());
        if (employee.getGender() == 'F')
        {
            femaleButton.setSelected(true);
        }
        else
        {
            maleButton.setSelected(true);
        }

        setDateBoxes(employee.getDateOfBirth(), birthDayBox, birthMonthBox, birthYearBox);
        setDateBoxes(employee.getStart(), startDayBox, startMonthBox, startYearBox);

        salaryField.setText("" + employee.getSalary());
        natInsField.setText(employee.getNatInsNo());
        phoneField.setText(employee.getPhone());
        jobTitleField.setText(employee.getJobTitle());
        messageLabel.setText("Record displayed.");
    }

    private void setDateBoxes(Date date, JComboBox<String> dayBox, JComboBox<String> monthBox, JComboBox<String> yearBox)
    {
        String[] parts = date.toString().split("/");
        dayBox.setSelectedItem(parts[0]);
        monthBox.setSelectedItem(parts[1]);
        yearBox.setSelectedItem(parts[2]);
    }

    private void displayNextRecord()
    {
        if (testStore.size() == 0)
        {
            showError("No records saved.");
            return;
        }

        if (displayIndex >= testStore.size())
        {
            displayIndex = 0;
        }

        Employee employee = testStore.get(displayIndex);
        currentIndex = displayIndex;
        displayIndex++;
        showEmployee(employee);
    }

    private void deleteCurrentRecord()
    {
        if (currentIndex < 0)
        {
            showError("No displayed record to delete.");
            return;
        }

        testStore.remove(currentIndex);
        currentIndex = -1;
        changed = true;
        clearForm();
        messageLabel.setText("Record deleted.");
    }

    private void clearForm()
    {
        nameField.setText("");
        maleButton.setSelected(true);
        birthDayBox.setSelectedItem("1");
        birthMonthBox.setSelectedItem("1");
        birthYearBox.setSelectedItem("2008");
        salaryField.setText("");
        natInsField.setText("");
        phoneField.setText("");
        startDayBox.setSelectedItem("1");
        startMonthBox.setSelectedItem("1");
        startYearBox.setSelectedItem("2024");
        jobTitleField.setText("");
        currentIndex = -1;
        messageLabel.setText("");
    }

    private void choosePicture()
    {
        JFileChooser chooser = new JFileChooser();
        int result = chooser.showOpenDialog(this);

        if (result == JFileChooser.APPROVE_OPTION)
        {
            File file = chooser.getSelectedFile();
            ImageIcon icon = new ImageIcon(file.getAbsolutePath());
            Image image = icon.getImage().getScaledInstance(170, 220, Image.SCALE_SMOOTH);
            photoLabel.setText("");
            photoLabel.setIcon(new ImageIcon(image));
        }
    }

    private void newStore()
    {
        if (confirmDiscard())
        {
            testStore = new Store(200);
            displayIndex = 0;
            currentIndex = -1;
            changed = false;
            clearForm();
            messageLabel.setText("New store created.");
        }
    }

    private void saveStore()
    {
        JFileChooser chooser = new JFileChooser();
        int result = chooser.showSaveDialog(this);

        if (result == JFileChooser.APPROVE_OPTION)
        {
            File file = chooser.getSelectedFile();

            try
            {
                testStore.saveToFile(file);
                changed = false;
                messageLabel.setText("Store saved.");
            }
            catch (IOException ex)
            {
                showError("The store could not be saved.");
            }
        }
    }

    private void openStore()
    {
        if (!confirmDiscard())
        {
            return;
        }

        JFileChooser chooser = new JFileChooser();
        int result = chooser.showOpenDialog(this);

        if (result == JFileChooser.APPROVE_OPTION)
        {
            File file = chooser.getSelectedFile();

            try
            {
                testStore = Store.loadFromFile(file);
                displayIndex = 0;
                currentIndex = -1;
                changed = false;
                clearForm();
                messageLabel.setText("Store opened.");
            }
            catch (Exception ex)
            {
                showError("The store could not be opened.");
            }
        }
    }

    private boolean confirmDiscard()
    {
        if (!changed)
        {
            return true;
        }

        int answer = JOptionPane.showConfirmDialog(this,
            "The current store has not been saved. Continue?",
            "Unsaved Store",
            JOptionPane.YES_NO_OPTION);

        return answer == JOptionPane.YES_OPTION;
    }

    private void closeApplication()
    {
        if (changed)
        {
            int answer = JOptionPane.showConfirmDialog(this,
                "Save the current store before quitting?",
                "Quit",
                JOptionPane.YES_NO_CANCEL_OPTION);

            if (answer == JOptionPane.CANCEL_OPTION)
            {
                return;
            }

            if (answer == JOptionPane.YES_OPTION)
            {
                saveStore();
                if (changed)
                {
                    return;
                }
            }
        }

        dispose();
        System.exit(0);
    }

    private void showError(String message)
    {
        JOptionPane.showMessageDialog(this, message, "Employee Record System", JOptionPane.ERROR_MESSAGE);
    }
}
